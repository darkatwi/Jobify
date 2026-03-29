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

public class RecruiterTests
{
    private static AppDbContext CreateDb(string name)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(name)
            .Options;

        return new AppDbContext(options);
    }

    private static OpportunitiesController CreateController(AppDbContext db, string? userId = "recruiter-1")
    {
        var controller = new OpportunitiesController(
            db,
            null!,
            null!,
            null!
        );

        ClaimsPrincipal principal;

        if (!string.IsNullOrEmpty(userId))
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Role, "Recruiter")
            };

            principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
        }
        else
        {
            // IMPORTANT FIX (no null principal)
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

    private static Opportunity CreateOpportunity(int id, string recruiterId, bool closed = false)
    {
        return new Opportunity
        {
            Id = id,
            Title = "Software Engineer",
            CompanyName = "Jobify",
            RecruiterUserId = recruiterId,
            Type = OpportunityType.Job,
            Level = ExperienceLevel.Entry,
            WorkMode = WorkMode.OnSite,
            IsRemote = false,
            IsClosed = closed,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    // =========================
    // CREATE
    // =========================

    [Fact]
    public async Task Create_ReturnsUnauthorized_When_UserIdMissing()
    {
        using var db = CreateDb(nameof(Create_ReturnsUnauthorized_When_UserIdMissing));
        var controller = CreateController(db, null);

        var dto = new CreateOpportunityDto
        {
            Title = "Backend Engineer",
            CompanyName = "Jobify",
            Type = "Job",
            Level = "Entry",
            WorkMode = "OnSite"
        };

        var result = await controller.Create(dto);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_When_TitleMissing()
    {
        using var db = CreateDb(nameof(Create_ReturnsBadRequest_When_TitleMissing));
        var controller = CreateController(db);

        var dto = new CreateOpportunityDto
        {
            Title = "",
            CompanyName = "Jobify",
            Type = "Job",
            Level = "Entry",
            WorkMode = "OnSite"
        };

        var result = await controller.Create(dto);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Title and CompanyName are required.", badRequest.Value);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_When_TypeInvalid()
    {
        using var db = CreateDb(nameof(Create_ReturnsBadRequest_When_TypeInvalid));
        var controller = CreateController(db);

        var dto = new CreateOpportunityDto
        {
            Title = "Backend Engineer",
            CompanyName = "Jobify",
            Type = "WrongType",
            Level = "Entry",
            WorkMode = "OnSite"
        };

        var result = await controller.Create(dto);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Invalid Type.", badRequest.Value);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_When_LevelInvalid()
    {
        using var db = CreateDb(nameof(Create_ReturnsBadRequest_When_LevelInvalid));
        var controller = CreateController(db);

        var dto = new CreateOpportunityDto
        {
            Title = "Backend Engineer",
            CompanyName = "Jobify",
            Type = "Job",         // VALID
            Level = "WrongLevel", // INVALID
            WorkMode = "OnSite"
        };

        var result = await controller.Create(dto);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Invalid Level.", badRequest.Value);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_When_WorkModeInvalid()
    {
        using var db = CreateDb(nameof(Create_ReturnsBadRequest_When_WorkModeInvalid));
        var controller = CreateController(db);

        var dto = new CreateOpportunityDto
        {
            Title = "Backend Engineer",
            CompanyName = "Jobify",
            Type = "Job",       // VALID
            Level = "Entry",   // VALID
            WorkMode = "Fake"  // INVALID
        };

        var result = await controller.Create(dto);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Invalid WorkMode. Use OnSite, Remote, or Hybrid.", badRequest.Value);
    }

    [Fact]
    public async Task Create_CreatesOpportunity_When_Valid()
    {
        using var db = CreateDb(nameof(Create_CreatesOpportunity_When_Valid));
        var controller = CreateController(db);

        var dto = new CreateOpportunityDto
        {
            Title = "Backend Engineer",
            CompanyName = "Jobify",
            Type = "Job",
            Level = "Entry",
            WorkMode = "Remote",
            Skills = new List<string>(),          // avoid notification service
            PreferredSkills = new List<string>(),
            Responsibilities = new List<string>(),
            Benefits = new List<string>()
        };

        var result = await controller.Create(dto);

        var created = Assert.IsType<CreatedAtActionResult>(result);

        var opp = await db.Opportunities.FirstOrDefaultAsync();
        Assert.NotNull(opp);
        Assert.Equal("Backend Engineer", opp!.Title);
        Assert.True(opp.IsRemote);
    }

    // =========================
    // UPDATE
    // =========================

    [Fact]
    public async Task Update_ReturnsNotFound_When_NotOwner()
    {
        using var db = CreateDb(nameof(Update_ReturnsNotFound_When_NotOwner));
        db.Opportunities.Add(CreateOpportunity(1, "other-user"));
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var dto = new UpdateOpportunityDto
        {
            Title = "Updated",
            CompanyName = "Jobify",
            Type = "Job",
            Level = "Entry",
            WorkMode = "OnSite",
            Skills = new List<string> { "C#" }
        };

        var result = await controller.Update(1, dto);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Update_UpdatesOpportunity_When_Valid()
    {
        using var db = CreateDb(nameof(Update_UpdatesOpportunity_When_Valid));
        db.Opportunities.Add(CreateOpportunity(1, "recruiter-1"));
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var dto = new UpdateOpportunityDto
        {
            Title = "Updated Title",
            CompanyName = "New Company",
            Type = "Job",
            Level = "Senior",
            WorkMode = "Remote",
            Skills = new List<string> { "C#" },
            PreferredSkills = new List<string>()
        };

        var result = await controller.Update(1, dto);

        Assert.IsType<NoContentResult>(result);

        var opp = await db.Opportunities.FindAsync(1);
        Assert.Equal("Updated Title", opp!.Title);
        Assert.True(opp.IsRemote);
    }

    // =========================
    // DELETE
    // =========================

    [Fact]
    public async Task Delete_RemovesOpportunity()
    {
        using var db = CreateDb(nameof(Delete_RemovesOpportunity));
        db.Opportunities.Add(CreateOpportunity(1, "recruiter-1"));
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var result = await controller.Delete(1);

        Assert.IsType<NoContentResult>(result);
        Assert.False(db.Opportunities.Any());
    }

    // =========================
    // CLOSE / REOPEN
    // =========================

    [Fact]
    public async Task Close_SetsClosed()
    {
        using var db = CreateDb(nameof(Close_SetsClosed));
        db.Opportunities.Add(CreateOpportunity(1, "recruiter-1"));
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var result = await controller.Close(1);

        Assert.IsType<NoContentResult>(result);

        var opp = await db.Opportunities.FindAsync(1);
        Assert.True(opp!.IsClosed);
    }

    [Fact]
    public async Task Reopen_SetsOpen()
    {
        using var db = CreateDb(nameof(Reopen_SetsOpen));
        db.Opportunities.Add(CreateOpportunity(1, "recruiter-1", true));
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var result = await controller.Reopen(1);

        Assert.IsType<NoContentResult>(result);

        var opp = await db.Opportunities.FindAsync(1);
        Assert.False(opp!.IsClosed);
    }

    // =========================
    // ANSWER QUESTION
    // =========================

    [Fact]
    public async Task AnswerQuestion_UpdatesAnswer()
    {
        using var db = CreateDb(nameof(AnswerQuestion_UpdatesAnswer));

        db.OpportunityQuestions.Add(new OpportunityQuestion
        {
            Id = 1,
            OpportunityId = 1,
            Question = "Test?"
        });

        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var dto = new QaDto { Answer = "Yes" };

        var result = await controller.AnswerQuestion(1, dto);

        Assert.IsType<NoContentResult>(result);

        var q = await db.OpportunityQuestions.FindAsync(1);
        Assert.Equal("Yes", q!.Answer);
    }
}