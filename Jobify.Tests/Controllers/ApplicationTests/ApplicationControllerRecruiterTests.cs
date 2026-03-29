using Jobify.Api.Controllers;
using Jobify.Api.Data;
using Jobify.Api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using System.Net.Http;
using System.Security.Claims;
using Xunit;
using Microsoft.AspNetCore.Identity;

namespace Jobify.Tests.Controllers.ApplicationTests;

public class ApplicationControllerRecruiterTests
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

    private static Opportunity CreateOpportunity(
        int id,
        string recruiterUserId,
        string title = "Software Engineer Intern",
        string companyName = "Jobify")
    {
        return new Opportunity
        {
            Id = id,
            Title = title,
            CompanyName = companyName,
            RecruiterUserId = recruiterUserId,
            OpportunitySkills = new List<OpportunitySkill>()
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
            UpdatedAtUtc = DateTime.UtcNow.AddDays(-id)
        };
    }

    [Fact]
    public async Task GetApplicationsForOpportunity_OpportunityNotFound_ReturnsNotFound()
    {
        using var db = CreateDbContext(nameof(GetApplicationsForOpportunity_OpportunityNotFound_ReturnsNotFound));
        var controller = CreateController(db, "recruiter-1");

        var result = await controller.GetApplicationsForOpportunity(999);

        var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
        Assert.Equal("Opportunity not found.", notFound.Value);
    }

    [Fact]
    public async Task GetApplicationsForOpportunity_WrongRecruiter_ReturnsForbid()
    {
        using var db = CreateDbContext(nameof(GetApplicationsForOpportunity_WrongRecruiter_ReturnsForbid));

        var opp = CreateOpportunity(1, "recruiter-2");
        db.Opportunities.Add(opp);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var result = await controller.GetApplicationsForOpportunity(1);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task GetApplicationsForOpportunity_ReturnsOnlyNonWithdrawnApplications()
    {
        using var db = CreateDbContext(nameof(GetApplicationsForOpportunity_ReturnsOnlyNonWithdrawnApplications));

        var opp = CreateOpportunity(1, "recruiter-1");

        var app1 = CreateApplication(1, opp, "student-1", ApplicationStatus.Submitted);
        var app2 = CreateApplication(2, opp, "student-2", ApplicationStatus.Withdrawn);

        db.Opportunities.Add(opp);
        db.Applications.AddRange(app1, app2);

        db.Users.Add(new IdentityUser
        {
            Id = "student-1",
            Email = "student1@test.com",
            UserName = "student1@test.com"
        });

        db.Users.Add(new IdentityUser
        {
            Id = "student-2",
            Email = "student2@test.com",
            UserName = "student2@test.com"
        });

        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var result = await controller.GetApplicationsForOpportunity(1);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var apps = Assert.IsAssignableFrom<List<ApplicationController.RecruiterAppListDto>>(ok.Value);

        Assert.Single(apps);
        Assert.Equal(1, apps[0].ApplicationId);
    }

    [Fact]
    public async Task GetCompanyApplications_NoRecruiterProfile_ReturnsForbid()
    {
        using var db = CreateDbContext(nameof(GetCompanyApplications_NoRecruiterProfile_ReturnsForbid));
        var controller = CreateController(db, "recruiter-1");

        var result = await controller.GetCompanyApplications();

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task GetCompanyApplications_ReturnsOnlyRecruiterCompanyApplications()
    {
        using var db = CreateDbContext(nameof(GetCompanyApplications_ReturnsOnlyRecruiterCompanyApplications));

        db.RecruiterProfiles.Add(new RecruiterProfile
        {
            UserId = "recruiter-1",
            CompanyName = "Jobify"
        });

        var opp1 = CreateOpportunity(1, "recruiter-1", "Backend Intern", "Jobify");
        var opp2 = CreateOpportunity(2, "recruiter-2", "Frontend Intern", "OtherCo");

        var app1 = CreateApplication(1, opp1, "student-1", ApplicationStatus.Submitted);
        var app2 = CreateApplication(2, opp2, "student-2", ApplicationStatus.Submitted);

        db.Opportunities.AddRange(opp1, opp2);
        db.Applications.AddRange(app1, app2);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var result = await controller.GetCompanyApplications();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        var items = Assert.IsAssignableFrom<System.Collections.IEnumerable>(ok.Value)
            .Cast<object>()
            .ToList();

        Assert.Single(items);

        var first = items[0];
        var titleProp = first.GetType().GetProperty("opportunityTitle");
        Assert.NotNull(titleProp);

        var title = titleProp!.GetValue(first)?.ToString();
        Assert.Equal("Backend Intern", title);
    }

    [Fact]
    public async Task GetApplicationWithProfile_NotFound_WhenApplicationMissing()
    {
        using var db = CreateDbContext(nameof(GetApplicationWithProfile_NotFound_WhenApplicationMissing));
        var controller = CreateController(db, "recruiter-1");

        var result = await controller.GetApplicationWithProfile(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetApplicationWithProfile_WrongRecruiter_ReturnsForbid()
    {
        using var db = CreateDbContext(nameof(GetApplicationWithProfile_WrongRecruiter_ReturnsForbid));

        var opp = CreateOpportunity(1, "recruiter-2");
        var app = CreateApplication(1, opp, "student-1");

        db.Opportunities.Add(opp);
        db.Applications.Add(app);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var result = await controller.GetApplicationWithProfile(1);

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task GetApplicationWithProfile_ReturnsOk_ForOwnedApplication()
    {
        using var db = CreateDbContext(nameof(GetApplicationWithProfile_ReturnsOk_ForOwnedApplication));

        var opp = CreateOpportunity(1, "recruiter-1");
        var app = CreateApplication(1, opp, "student-1");

        db.Opportunities.Add(opp);
        db.Applications.Add(app);

        db.Users.Add(new IdentityUser
        {
            Id = "student-1",
            Email = "student1@test.com",
            UserName = "student1@test.com"
        });

        db.StudentProfiles.Add(new StudentProfile
        {
            UserId = "student-1",
            FullName = "Waed Atwi",
            Email = "waed@test.com",
            University = "AUB",
            Major = "Computer Science"
        });

        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var result = await controller.GetApplicationWithProfile(1);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        var text = ok.Value!.ToString()!;
        Assert.Contains("Waed", text);
        Assert.Contains("Computer Science", text);
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