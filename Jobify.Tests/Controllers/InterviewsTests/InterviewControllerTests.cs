using System.Security.Claims;
using Jobify.Api.Controllers;
using Jobify.Api.Data;
using Jobify.Api.DTOs;
using Jobify.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Jobify.Tests.Controllers.InterviewsTests;

public class InterviewsControllerTests
{
    private static AppDbContext CreateDb(string name)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(name)
            .Options;

        return new AppDbContext(options);
    }

    // ✅ FIXED HELPER (IMPORTANT)
    private static InterviewsController CreateController(AppDbContext db, string? userId = null)
    {
        var controller = new InterviewsController(db);

        ClaimsPrincipal principal;

        if (userId != null)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId)
            };

            principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
        }
        else
        {
            // ❗ empty user instead of null (fixes crash)
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

    // =========================
    // CREATE TESTS
    // =========================

    [Fact]
    public async Task Create_Should_Return_Unauthorized_When_No_User()
    {
        using var db = CreateDb(nameof(Create_Should_Return_Unauthorized_When_No_User));

        var controller = CreateController(db, null);

        var result = await controller.Create(new CreateInterviewDto());

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task Create_Should_Return_NotFound_When_Application_Not_Found()
    {
        using var db = CreateDb(nameof(Create_Should_Return_NotFound_When_Application_Not_Found));

        var controller = CreateController(db, "recruiter-1");

        var result = await controller.Create(new CreateInterviewDto
        {
            ApplicationId = 1
        });

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Create_Should_Return_Forbid_When_Not_Owner()
    {
        using var db = CreateDb(nameof(Create_Should_Return_Forbid_When_Not_Owner));

        var app = new Application
        {
            Id = 1,
            Opportunity = new Opportunity
            {
                RecruiterUserId = "other-recruiter"
            },
            Status = ApplicationStatus.Shortlisted
        };

        db.Applications.Add(app);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var result = await controller.Create(new CreateInterviewDto
        {
            ApplicationId = 1
        });

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task Create_Should_Return_BadRequest_When_Status_Invalid()
    {
        using var db = CreateDb(nameof(Create_Should_Return_BadRequest_When_Status_Invalid));

        var app = new Application
        {
            Id = 1,
            Opportunity = new Opportunity
            {
                RecruiterUserId = "recruiter-1"
            },
            Status = ApplicationStatus.Pending
        };

        db.Applications.Add(app);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var result = await controller.Create(new CreateInterviewDto
        {
            ApplicationId = 1
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_Should_Create_Interview_And_Update_Status()
    {
        using var db = CreateDb(nameof(Create_Should_Create_Interview_And_Update_Status));

        var app = new Application
        {
            Id = 1,
            Opportunity = new Opportunity
            {
                RecruiterUserId = "recruiter-1"
            },
            Status = ApplicationStatus.Shortlisted
        };

        db.Applications.Add(app);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var dto = new CreateInterviewDto
        {
            ApplicationId = 1,
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1),
            MeetingLink = "link"
        };

        var result = await controller.Create(dto);

        Assert.IsType<OkObjectResult>(result);
        Assert.Single(db.Interviews);

        var savedApp = await db.Applications.FindAsync(1);
        Assert.Equal(ApplicationStatus.InterviewScheduled, savedApp!.Status);
    }

    // =========================
    // UPDATE TESTS
    // =========================

    [Fact]
    public async Task Update_Should_Return_NotFound_When_Interview_Not_Found()
    {
        using var db = CreateDb(nameof(Update_Should_Return_NotFound_When_Interview_Not_Found));

        var controller = CreateController(db, "recruiter-1");

        var result = await controller.Update(1, new CreateInterviewDto());

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Update_Should_Return_Forbid_When_Not_Owner()
    {
        using var db = CreateDb(nameof(Update_Should_Return_Forbid_When_Not_Owner));

        var interview = new Interview
        {
            Id = 1,
            Application = new Application
            {
                Opportunity = new Opportunity
                {
                    RecruiterUserId = "other"
                }
            }
        };

        db.Interviews.Add(interview);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var result = await controller.Update(1, new CreateInterviewDto());

        Assert.IsType<ForbidResult>(result);
    }

    // =========================
    // DELETE TESTS
    // =========================

    [Fact]
    public async Task Delete_Should_Return_NotFound_When_Interview_Not_Found()
    {
        using var db = CreateDb(nameof(Delete_Should_Return_NotFound_When_Interview_Not_Found));

        var controller = CreateController(db, "recruiter-1");

        var result = await controller.Delete(1);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Delete_Should_Return_Forbid_When_Not_Owner()
    {
        using var db = CreateDb(nameof(Delete_Should_Return_Forbid_When_Not_Owner));

        var interview = new Interview
        {
            Id = 1,
            Application = new Application
            {
                Opportunity = new Opportunity
                {
                    RecruiterUserId = "other"
                }
            }
        };

        db.Interviews.Add(interview);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var result = await controller.Delete(1);

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task Delete_Should_Remove_Interview()
    {
        using var db = CreateDb(nameof(Delete_Should_Remove_Interview));

        var interview = new Interview
        {
            Id = 1,
            Application = new Application
            {
                Opportunity = new Opportunity
                {
                    RecruiterUserId = "recruiter-1"
                }
            }
        };

        db.Interviews.Add(interview);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1");

        var result = await controller.Delete(1);

        Assert.IsType<NoContentResult>(result);
        Assert.Empty(db.Interviews);
    }
}