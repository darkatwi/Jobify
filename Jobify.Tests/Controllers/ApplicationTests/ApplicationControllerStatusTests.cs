using Jobify.Api.Controllers;
using Jobify.Api.Data;
using Jobify.Api.DTOs;
using Jobify.Api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using System.Security.Claims;
using Xunit;

namespace Jobify.Tests.Controllers.ApplicationTests;

public class ApplicationControllerStatusTests
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

    [Fact]
    public async Task UpdateApplicationStatus_InvalidStatus_ReturnsBadRequest()
    {
        using var db = CreateDbContext(nameof(UpdateApplicationStatus_InvalidStatus_ReturnsBadRequest));

        var controller = CreateController(db);

        var dto = new UpdateApplicationStatusDto
        {
            Status = "NotARealStatus"
        };

        var result = await controller.UpdateApplicationStatus(1, dto);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("Invalid status", badRequest.Value?.ToString());
    }

    [Fact]
    public async Task UpdateApplicationStatus_ApplicationNotFound_ReturnsNotFound()
    {
        using var db = CreateDbContext(nameof(UpdateApplicationStatus_ApplicationNotFound_ReturnsNotFound));

        var controller = CreateController(db);

        var dto = new UpdateApplicationStatusDto
        {
            Status = "Submitted"
        };

        var result = await controller.UpdateApplicationStatus(999, dto);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal("Application not found.", notFound.Value);
    }

    [Fact]
    public async Task UpdateApplicationStatus_InvalidTransition_ReturnsBadRequest()
    {
        using var db = CreateDbContext(nameof(UpdateApplicationStatus_InvalidTransition_ReturnsBadRequest));

        var opportunity = new Opportunity
        {
            Id = 1,
            Title = "Software Engineer Intern",
            CompanyName = "Jobify",
            RecruiterUserId = "recruiter-1"
        };

        var application = new Application
        {
            Id = 1,
            OpportunityId = 1,
            Opportunity = opportunity,
            UserId = "student-1",
            StudentUserId = "student-1",
            Status = ApplicationStatus.Draft,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.Opportunities.Add(opportunity);
        db.Applications.Add(application);
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var dto = new UpdateApplicationStatusDto
        {
            Status = "Accepted"
        };

        var result = await controller.UpdateApplicationStatus(1, dto);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("Invalid status transition", badRequest.Value?.ToString());

        var saved = await db.Applications.FindAsync(1);
        Assert.NotNull(saved);
        Assert.Equal(ApplicationStatus.Draft, saved!.Status);
    }

    [Fact]
    public async Task UpdateApplicationStatus_ValidTransition_UpdatesStatus()
    {
        using var db = CreateDbContext(nameof(UpdateApplicationStatus_ValidTransition_UpdatesStatus));

        var opportunity = new Opportunity
        {
            Id = 1,
            Title = "Software Engineer Intern",
            CompanyName = "Jobify",
            RecruiterUserId = "recruiter-1"
        };

        var application = new Application
        {
            Id = 1,
            OpportunityId = 1,
            Opportunity = opportunity,
            UserId = "student-1",
            StudentUserId = "student-1",
            Status = ApplicationStatus.Draft,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow.AddDays(-1)
        };

        db.Opportunities.Add(opportunity);
        db.Applications.Add(application);
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var dto = new UpdateApplicationStatusDto
        {
            Status = "Submitted",
            Note = "Looks good"
        };

        var result = await controller.UpdateApplicationStatus(1, dto);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        var saved = await db.Applications.FindAsync(1);
        Assert.NotNull(saved);
        Assert.Equal(ApplicationStatus.Submitted, saved!.Status);
        Assert.Equal("Looks good", saved.Note);
    }

    [Fact]
    public async Task RecruiterUpdateApplication_NoRecruiterProfile_ReturnsForbid()
    {
        using var db = CreateDbContext(nameof(RecruiterUpdateApplication_NoRecruiterProfile_ReturnsForbid));

        var controller = CreateController(db, "recruiter-1");

        var dto = new UpdateApplicationStatusDto
        {
            Status = "Submitted"
        };

        var result = await controller.RecruiterUpdateApplication(1, dto);

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task RecruiterUpdateApplication_ApplicationNotFound_ReturnsNotFound()
    {
        using var db = CreateDbContext(nameof(RecruiterUpdateApplication_ApplicationNotFound_ReturnsNotFound));

        db.RecruiterProfiles.Add(new RecruiterProfile
        {
            UserId = "recruiter-1",
            CompanyName = "Jobify"
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var dto = new UpdateApplicationStatusDto
        {
            Status = "Submitted"
        };

        var result = await controller.RecruiterUpdateApplication(999, dto);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task RecruiterUpdateApplication_WrongRecruiter_ReturnsForbid()
    {
        using var db = CreateDbContext(nameof(RecruiterUpdateApplication_WrongRecruiter_ReturnsForbid));

        db.RecruiterProfiles.Add(new RecruiterProfile
        {
            UserId = "recruiter-1",
            CompanyName = "Jobify"
        });

        var opportunity = new Opportunity
        {
            Id = 1,
            Title = "Backend Intern",
            CompanyName = "Another Company",
            RecruiterUserId = "different-recruiter"
        };

        var application = new Application
        {
            Id = 1,
            OpportunityId = 1,
            Opportunity = opportunity,
            UserId = "student-1",
            StudentUserId = "student-1",
            Status = ApplicationStatus.Draft,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.Opportunities.Add(opportunity);
        db.Applications.Add(application);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var dto = new UpdateApplicationStatusDto
        {
            Status = "Submitted"
        };

        var result = await controller.RecruiterUpdateApplication(1, dto);

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task RecruiterUpdateApplication_WithdrawnApplication_ReturnsBadRequest()
    {
        using var db = CreateDbContext(nameof(RecruiterUpdateApplication_WithdrawnApplication_ReturnsBadRequest));

        db.RecruiterProfiles.Add(new RecruiterProfile
        {
            UserId = "recruiter-1",
            CompanyName = "Jobify"
        });

        var opportunity = new Opportunity
        {
            Id = 1,
            Title = "Backend Intern",
            CompanyName = "Jobify",
            RecruiterUserId = "recruiter-1"
        };

        var application = new Application
        {
            Id = 1,
            OpportunityId = 1,
            Opportunity = opportunity,
            UserId = "student-1",
            StudentUserId = "student-1",
            Status = ApplicationStatus.Withdrawn,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.Opportunities.Add(opportunity);
        db.Applications.Add(application);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var dto = new UpdateApplicationStatusDto
        {
            Status = "Submitted"
        };

        var result = await controller.RecruiterUpdateApplication(1, dto);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Cannot update a withdrawn application.", badRequest.Value);
    }

    [Fact]
    public async Task RecruiterUpdateApplication_InvalidTransition_ReturnsBadRequest()
    {
        using var db = CreateDbContext(nameof(RecruiterUpdateApplication_InvalidTransition_ReturnsBadRequest));

        db.RecruiterProfiles.Add(new RecruiterProfile
        {
            UserId = "recruiter-1",
            CompanyName = "Jobify"
        });

        var opportunity = new Opportunity
        {
            Id = 1,
            Title = "Backend Intern",
            CompanyName = "Jobify",
            RecruiterUserId = "recruiter-1"
        };

        var application = new Application
        {
            Id = 1,
            OpportunityId = 1,
            Opportunity = opportunity,
            UserId = "student-1",
            StudentUserId = "student-1",
            Status = ApplicationStatus.Draft,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.Opportunities.Add(opportunity);
        db.Applications.Add(application);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var dto = new UpdateApplicationStatusDto
        {
            Status = "Accepted"
        };

        var result = await controller.RecruiterUpdateApplication(1, dto);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("Invalid status transition", badRequest.Value?.ToString());

        var saved = await db.Applications.FindAsync(1);
        Assert.NotNull(saved);
        Assert.Equal(ApplicationStatus.Draft, saved!.Status);
    }

    [Fact]
    public async Task RecruiterUpdateApplication_ValidTransition_UpdatesStatus_And_Note()
    {
        using var db = CreateDbContext(nameof(RecruiterUpdateApplication_ValidTransition_UpdatesStatus_And_Note));

        db.RecruiterProfiles.Add(new RecruiterProfile
        {
            UserId = "recruiter-1",
            CompanyName = "Jobify"
        });

        var opportunity = new Opportunity
        {
            Id = 1,
            Title = "Backend Intern",
            CompanyName = "Jobify",
            RecruiterUserId = "recruiter-1"
        };

        var application = new Application
        {
            Id = 1,
            OpportunityId = 1,
            Opportunity = opportunity,
            UserId = "student-1",
            StudentUserId = "student-1",
            Status = ApplicationStatus.Submitted,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.Opportunities.Add(opportunity);
        db.Applications.Add(application);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var dto = new UpdateApplicationStatusDto
        {
            Status = "InReview",
            Note = "Reviewed by recruiter"
        };

        var result = await controller.RecruiterUpdateApplication(1, dto);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        var saved = await db.Applications.FindAsync(1);
        Assert.NotNull(saved);
        Assert.Equal(ApplicationStatus.InReview, saved!.Status);
        Assert.Equal("Reviewed by recruiter", saved.Note);
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