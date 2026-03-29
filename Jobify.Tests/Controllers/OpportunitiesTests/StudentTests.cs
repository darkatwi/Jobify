using System.Security.Claims;
using Jobify.Api.Controllers;
using Jobify.Api.Data;
using Jobify.Api.DTOs;
using Jobify.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Jobify.Tests.Controllers.OpportunitiesTests;

public class StudentTests
{
    private static AppDbContext CreateDb(string name)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(name)
            .Options;

        return new AppDbContext(options);
    }

    private static OpportunitiesController CreateController(AppDbContext db, string? userId = "student-1")
    {
        var controller = new OpportunitiesController(db, null!, null!, null!);

        ClaimsPrincipal principal;

        if (!string.IsNullOrEmpty(userId))
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Role, "Student")
            };

            principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
        }
        else
        {
            principal = new ClaimsPrincipal(new ClaimsIdentity());
        }

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = principal
            }
        };

        return controller;
    }

    private static Opportunity CreateOpportunity(int id)
    {
        return new Opportunity
        {
            Id = id,
            Title = "Test Opportunity",
            CompanyName = "Jobify",
            RecruiterUserId = "recruiter-1",
            Type = OpportunityType.Job,
            Level = ExperienceLevel.Entry,
            WorkMode = WorkMode.OnSite,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    [Fact]
    public async Task SaveOpportunity_Success()
    {
        using var db = CreateDb(nameof(SaveOpportunity_Success));

        db.Opportunities.Add(CreateOpportunity(1));
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.SaveOpportunity(1);

        Assert.IsType<OkObjectResult>(result);
        Assert.True(await db.SavedOpportunities.AnyAsync(x => x.UserId == "student-1" && x.OpportunityId == 1));
    }

    [Fact]
    public async Task SaveOpportunity_NotFound()
    {
        using var db = CreateDb(nameof(SaveOpportunity_NotFound));
        var controller = CreateController(db, "student-1");

        var result = await controller.SaveOpportunity(1);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal("Opportunity not found.", notFound.Value);
    }

    [Fact]
    public async Task SaveOpportunity_ReturnsBadRequest_When_AlreadySaved()
    {
        using var db = CreateDb(nameof(SaveOpportunity_ReturnsBadRequest_When_AlreadySaved));

        db.Opportunities.Add(CreateOpportunity(1));
        db.SavedOpportunities.Add(new SavedOpportunity
        {
            UserId = "student-1",
            OpportunityId = 1,
            SavedAtUtc = DateTime.UtcNow
        });

        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.SaveOpportunity(1);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Opportunity already saved.", badRequest.Value);
    }

    [Fact]
    public async Task UnsaveOpportunity_Success()
    {
        using var db = CreateDb(nameof(UnsaveOpportunity_Success));

        db.Opportunities.Add(CreateOpportunity(1));
        db.SavedOpportunities.Add(new SavedOpportunity
        {
            UserId = "student-1",
            OpportunityId = 1,
            SavedAtUtc = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.UnsaveOpportunity(1);

        Assert.IsType<OkObjectResult>(result);
        Assert.False(await db.SavedOpportunities.AnyAsync(x => x.UserId == "student-1" && x.OpportunityId == 1));
    }

    [Fact]
    public async Task UnsaveOpportunity_NotFound()
    {
        using var db = CreateDb(nameof(UnsaveOpportunity_NotFound));

        db.Opportunities.Add(CreateOpportunity(1));
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.UnsaveOpportunity(1);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal("Saved opportunity not found.", notFound.Value);
    }

    [Fact]
    public async Task GetSavedOpportunities_ReturnsList()
    {
        using var db = CreateDb(nameof(GetSavedOpportunities_ReturnsList));

        db.Opportunities.Add(CreateOpportunity(1));
        db.SavedOpportunities.Add(new SavedOpportunity
        {
            UserId = "student-1",
            OpportunityId = 1,
            SavedAtUtc = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.GetSavedOpportunities();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task GetSavedOpportunities_ReturnsOnlyCurrentUserSaved()
    {
        using var db = CreateDb(nameof(GetSavedOpportunities_ReturnsOnlyCurrentUserSaved));

        db.Opportunities.AddRange(
            CreateOpportunity(1),
            CreateOpportunity(2)
        );

        db.SavedOpportunities.AddRange(
            new SavedOpportunity
            {
                UserId = "student-1",
                OpportunityId = 1,
                SavedAtUtc = DateTime.UtcNow
            },
            new SavedOpportunity
            {
                UserId = "student-2",
                OpportunityId = 2,
                SavedAtUtc = DateTime.UtcNow
            }
        );

        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");
        var result = await controller.GetSavedOpportunities();

        var ok = Assert.IsType<OkObjectResult>(result);
        var value = Assert.IsAssignableFrom<IEnumerable<object>>(ok.Value);
        Assert.Single(value);
    }

    [Fact]
    public async Task GetSavedOpportunityIds_ReturnsIds()
    {
        using var db = CreateDb(nameof(GetSavedOpportunityIds_ReturnsIds));

        db.Opportunities.AddRange(
            CreateOpportunity(1),
            CreateOpportunity(2)
        );

        db.SavedOpportunities.AddRange(
            new SavedOpportunity
            {
                UserId = "student-1",
                OpportunityId = 1,
                SavedAtUtc = DateTime.UtcNow
            },
            new SavedOpportunity
            {
                UserId = "student-1",
                OpportunityId = 2,
                SavedAtUtc = DateTime.UtcNow
            }
        );

        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.GetSavedOpportunityIds();

        var ok = Assert.IsType<OkObjectResult>(result);
        var ids = Assert.IsAssignableFrom<List<int>>(ok.Value);

        Assert.Equal(2, ids.Count);
        Assert.Contains(1, ids);
        Assert.Contains(2, ids);
    }

    [Fact]
    public async Task ApplyNow_Success()
    {
        using var db = CreateDb(nameof(ApplyNow_Success));

        db.Opportunities.Add(CreateOpportunity(1));
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.ApplyNow(1);

        Assert.IsType<OkObjectResult>(result);

        var app = await db.Applications.FirstOrDefaultAsync(a =>
            a.OpportunityId == 1 && a.StudentUserId == "student-1");

        Assert.NotNull(app);
        Assert.Equal(ApplicationStatus.Draft, app!.Status);
    }

    [Fact]
    public async Task ApplyNow_NotFound()
    {
        using var db = CreateDb(nameof(ApplyNow_NotFound));
        var controller = CreateController(db, "student-1");

        var result = await controller.ApplyNow(1);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal("Opportunity not found.", notFound.Value);
    }

    [Fact]
    public async Task ApplyNow_ReturnsExistingApplication_WhenAlreadyApplied()
    {
        using var db = CreateDb(nameof(ApplyNow_ReturnsExistingApplication_WhenAlreadyApplied));

        db.Opportunities.Add(CreateOpportunity(1));
        db.Applications.Add(new Application
        {
            OpportunityId = 1,
            StudentUserId = "student-1",
            Status = ApplicationStatus.Submitted,
            CreatedAtUtc = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.ApplyNow(1);

        Assert.IsType<OkObjectResult>(result);

        var count = await db.Applications.CountAsync(a =>
            a.OpportunityId == 1 && a.StudentUserId == "student-1");

        Assert.Equal(1, count);
    }

    [Fact]
    public async Task AskQuestion_ReturnsBadRequest_When_QuestionMissing()
    {
        using var db = CreateDb(nameof(AskQuestion_ReturnsBadRequest_When_QuestionMissing));

        db.Opportunities.Add(CreateOpportunity(1));
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.AskQuestion(1, new QaDto { Question = "" });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Question is required.", badRequest.Value);
    }

    [Fact]
    public async Task AskQuestion_AddsQuestion_When_Valid()
    {
        using var db = CreateDb(nameof(AskQuestion_AddsQuestion_When_Valid));

        db.Opportunities.Add(CreateOpportunity(1));
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.AskQuestion(1, new QaDto { Question = "Is this remote?" });

        Assert.IsType<OkObjectResult>(result);
        Assert.True(await db.OpportunityQuestions.AnyAsync(q =>
            q.OpportunityId == 1 && q.Question == "Is this remote?"));
    }

    [Fact]
    public async Task ReportOpportunity_ReturnsNotFound_When_OpportunityMissing()
    {
        using var db = CreateDb(nameof(ReportOpportunity_ReturnsNotFound_When_OpportunityMissing));
        var controller = CreateController(db, "student-1");

        var dto = new CreateOpportunityReportDto
        {
            Reason = "Spam",
            Details = "Looks suspicious"
        };

        var result = await controller.ReportOpportunity(1, dto);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal("Opportunity not found", notFound.Value);
    }

    [Fact]
    public async Task ReportOpportunity_CreatesReport_When_Valid()
    {
        using var db = CreateDb(nameof(ReportOpportunity_CreatesReport_When_Valid));

        db.Opportunities.Add(CreateOpportunity(1));
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var dto = new CreateOpportunityReportDto
        {
            Reason = "Spam",
            Details = "Looks suspicious"
        };

        var result = await controller.ReportOpportunity(1, dto);

        Assert.IsType<OkObjectResult>(result);
        Assert.True(await db.OpportunityReports.AnyAsync(r =>
            r.OpportunityId == 1 &&
            r.ReporterUserId == "student-1" &&
            r.Reason == "Spam"));
    }
}