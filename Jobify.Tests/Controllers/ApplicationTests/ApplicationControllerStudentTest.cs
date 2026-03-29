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

public class ApplicationControllerStudentTests
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

    private static Opportunity CreateOpportunity(int id, string title)
    {
        return new Opportunity
        {
            Id = id,
            Title = title,
            CompanyName = "Jobify",
            RecruiterUserId = "recruiter-1"
        };
    }

    private static Application CreateApplication(
        int id,
        Opportunity opportunity,
        string studentId,
        ApplicationStatus status = ApplicationStatus.Submitted)
    {
        return new Application
        {
            Id = id,
            OpportunityId = opportunity.Id,
            Opportunity = opportunity,
            UserId = studentId,
            StudentUserId = studentId,
            Status = status,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-id),
            UpdatedAtUtc = DateTime.UtcNow.AddDays(-id),
            Note = $"Note {id}"
        };
    }

    [Fact]
    public async Task GetMyApplications_Returns_Only_Current_Student_Applications()
    {
        using var db = CreateDbContext(nameof(GetMyApplications_Returns_Only_Current_Student_Applications));

        var opp1 = CreateOpportunity(1, "Backend Intern");
        var opp2 = CreateOpportunity(2, "Frontend Intern");
        var opp3 = CreateOpportunity(3, "Data Intern");

        var myApp1 = CreateApplication(1, opp1, "student-1", ApplicationStatus.Submitted);
        var myApp2 = CreateApplication(2, opp2, "student-1", ApplicationStatus.InReview);
        var otherApp = CreateApplication(3, opp3, "student-2", ApplicationStatus.Submitted);

        db.Opportunities.AddRange(opp1, opp2, opp3);
        db.Applications.AddRange(myApp1, myApp2, otherApp);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.GetMyApplications();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var apps = Assert.IsAssignableFrom<List<ApplicationController.MyApplicationDto>>(ok.Value);

        Assert.Equal(2, apps.Count);
        Assert.All(apps, a => Assert.Contains(a.ApplicationId, new[] { 1, 2 }));
        Assert.DoesNotContain(apps, a => a.ApplicationId == 3);
    }

    [Fact]
    public async Task GetMyApplications_Returns_Empty_List_When_None_Exist()
    {
        using var db = CreateDbContext(nameof(GetMyApplications_Returns_Empty_List_When_None_Exist));

        var controller = CreateController(db, "student-1");

        var result = await controller.GetMyApplications();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var apps = Assert.IsAssignableFrom<List<ApplicationController.MyApplicationDto>>(ok.Value);

        Assert.Empty(apps);
    }

    [Fact]
    public async Task GetMyApplications_Does_Not_Return_Withdrawn_Applications()
    {
        using var db = CreateDbContext(nameof(GetMyApplications_Does_Not_Return_Withdrawn_Applications));

        var opp1 = CreateOpportunity(1, "Backend Intern");
        var opp2 = CreateOpportunity(2, "Frontend Intern");

        var activeApp = CreateApplication(1, opp1, "student-1", ApplicationStatus.Submitted);
        var withdrawnApp = CreateApplication(2, opp2, "student-1", ApplicationStatus.Withdrawn);

        db.Opportunities.AddRange(opp1, opp2);
        db.Applications.AddRange(activeApp, withdrawnApp);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.GetMyApplications();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var apps = Assert.IsAssignableFrom<List<ApplicationController.MyApplicationDto>>(ok.Value);

        Assert.Single(apps);
        Assert.Equal(1, apps[0].ApplicationId);
    }

    [Fact]
    public async Task GetMyApplication_Returns_Application_When_Owned_By_Student()
    {
        using var db = CreateDbContext(nameof(GetMyApplication_Returns_Application_When_Owned_By_Student));

        var opp = CreateOpportunity(1, "Backend Intern");
        var app = CreateApplication(1, opp, "student-1", ApplicationStatus.Submitted);

        db.Opportunities.Add(opp);
        db.Applications.Add(app);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.GetMyApplication(1);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task GetMyApplication_Returns_NotFound_When_Application_Does_Not_Exist()
    {
        using var db = CreateDbContext(nameof(GetMyApplication_Returns_NotFound_When_Application_Does_Not_Exist));

        var controller = CreateController(db, "student-1");

        var result = await controller.GetMyApplication(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetMyApplication_Returns_NotFound_When_Student_Does_Not_Own_It()
    {
        using var db = CreateDbContext(nameof(GetMyApplication_Returns_NotFound_When_Student_Does_Not_Own_It));

        var opp = CreateOpportunity(1, "Backend Intern");
        var app = CreateApplication(1, opp, "student-2", ApplicationStatus.Submitted);

        db.Opportunities.Add(opp);
        db.Applications.Add(app);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.GetMyApplication(1);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetMyApplicationSummary_Returns_Summary_When_Owned_By_Student()
    {
        using var db = CreateDbContext(nameof(GetMyApplicationSummary_Returns_Summary_When_Owned_By_Student));

        var opp = CreateOpportunity(1, "Backend Intern");
        var app = CreateApplication(1, opp, "student-1", ApplicationStatus.InReview);

        db.Opportunities.Add(opp);
        db.Applications.Add(app);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.GetMyApplicationSummary(1);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task GetMyApplicationSummary_Returns_NotFound_When_Application_Does_Not_Exist()
    {
        using var db = CreateDbContext(nameof(GetMyApplicationSummary_Returns_NotFound_When_Application_Does_Not_Exist));

        var controller = CreateController(db, "student-1");

        var result = await controller.GetMyApplicationSummary(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetMyApplicationSummary_Returns_NotFound_When_Student_Does_Not_Own_It()
    {
        using var db = CreateDbContext(nameof(GetMyApplicationSummary_Returns_NotFound_When_Student_Does_Not_Own_It));

        var opp = CreateOpportunity(1, "Backend Intern");
        var app = CreateApplication(1, opp, "student-2", ApplicationStatus.InReview);

        db.Opportunities.Add(opp);
        db.Applications.Add(app);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.GetMyApplicationSummary(1);

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