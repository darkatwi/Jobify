using System.Net.Http;
using System.Security.Claims;
using Jobify.Api.Controllers;
using Jobify.Api.Data;
using Jobify.Api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Xunit;

namespace Jobify.Tests.Controllers.ApplicationTests;

public class ApplicationControllerWithdrawTests
{
    private static AppDbContext CreateDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new AppDbContext(options);
    }

    private static ApplicationController CreateController(
        AppDbContext db,
        string? userId = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();

        var controller = new ApplicationController(
            db,
            new FakeHttpClientFactory(),
            config,
            new FakeWebHostEnvironment());

        if (!string.IsNullOrWhiteSpace(userId))
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, userId)
            };

            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = principal
                }
            };
        }

        return controller;
    }

    private static Opportunity CreateOpportunity(int id = 1)
    {
        return new Opportunity
        {
            Id = id,
            Title = "Software Engineer Intern",
            CompanyName = "Jobify",
            RecruiterUserId = "recruiter-1"
        };
    }

    private static Application CreateStudentApplication(
        Opportunity opportunity,
        int applicationId = 1,
        string studentId = "student-1",
        ApplicationStatus status = ApplicationStatus.Submitted)
    {
        return new Application
        {
            Id = applicationId,
            OpportunityId = opportunity.Id,
            Opportunity = opportunity,
            UserId = studentId,
            StudentUserId = studentId,
            Status = status,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-1),
            UpdatedAtUtc = DateTime.UtcNow.AddDays(-1)
        };
    }

    [Fact]
    public async Task WithdrawApplication_AppNotFound_ReturnsNotFound()
    {
        using var db = CreateDbContext(nameof(WithdrawApplication_AppNotFound_ReturnsNotFound));
        var controller = CreateController(db, "student-1");

        var result = await controller.WithdrawApplication(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task WithdrawApplication_AlreadyWithdrawn_ReturnsBadRequest()
    {
        using var db = CreateDbContext(nameof(WithdrawApplication_AlreadyWithdrawn_ReturnsBadRequest));

        var opportunity = CreateOpportunity();
        var app = CreateStudentApplication(
            opportunity,
            status: ApplicationStatus.Withdrawn);

        db.Opportunities.Add(opportunity);
        db.Applications.Add(app);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.WithdrawApplication(app.Id);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Application already withdrawn.", badRequest.Value);
    }

    [Fact]
    public async Task WithdrawApplication_ValidRequest_SetsWithdrawnStatus_And_Timestamps()
    {
        using var db = CreateDbContext(nameof(WithdrawApplication_ValidRequest_SetsWithdrawnStatus_And_Timestamps));

        var opportunity = CreateOpportunity();
        var app = CreateStudentApplication(
            opportunity,
            status: ApplicationStatus.Submitted);

        db.Opportunities.Add(opportunity);
        db.Applications.Add(app);
        await db.SaveChangesAsync();

        var oldUpdatedAt = app.UpdatedAtUtc;

        var controller = CreateController(db, "student-1");

        var result = await controller.WithdrawApplication(app.Id);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        var saved = await db.Applications.FindAsync(app.Id);
        Assert.NotNull(saved);

        Assert.Equal(ApplicationStatus.Withdrawn, saved!.Status);
        Assert.NotNull(saved.WithdrawndAt);
        Assert.True(saved.UpdatedAtUtc >= oldUpdatedAt);
    }

    [Fact]
    public async Task WithdrawApplication_OtherStudent_CannotWithdraw_ReturnsNotFound()
    {
        using var db = CreateDbContext(nameof(WithdrawApplication_OtherStudent_CannotWithdraw_ReturnsNotFound));

        var opportunity = CreateOpportunity();
        var app = CreateStudentApplication(
            opportunity,
            studentId: "student-1",
            status: ApplicationStatus.Submitted);

        db.Opportunities.Add(opportunity);
        db.Applications.Add(app);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-2");

        var result = await controller.WithdrawApplication(app.Id);

        Assert.IsType<NotFoundResult>(result);
    }

    private sealed class FakeHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }

    private sealed class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Jobify.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string WebRootPath { get; set; } = "wwwroot";
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; } = ".";
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}