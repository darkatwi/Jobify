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

public class AdditionalTests
{
    private static AppDbContext CreateDb(string name)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(name)
            .Options;

        return new AppDbContext(options);
    }

    private static OpportunitiesController CreateController(
        AppDbContext db,
        string? userId = "student-1",
        string? role = null)
    {
        var controller = new OpportunitiesController(
            db,
            null!,
            null!,
            null!
        );

        ClaimsPrincipal principal;

        if (!string.IsNullOrWhiteSpace(userId))
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId)
            };

            if (!string.IsNullOrWhiteSpace(role))
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

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

    private static Opportunity CreateOpportunity(
        int id,
        string title,
        string company,
        string recruiterId = "recruiter-1",
        bool closed = false,
        bool remote = false,
        string? location = null)
    {
        return new Opportunity
        {
            Id = id,
            Title = title,
            CompanyName = company,
            RecruiterUserId = recruiterId,
            Type = OpportunityType.Job,
            Level = ExperienceLevel.Entry,
            WorkMode = remote ? WorkMode.Remote : WorkMode.OnSite,
            IsRemote = remote,
            IsClosed = closed,
            Location = location,
            CreatedAtUtc = DateTime.UtcNow,
            OpportunitySkills = new List<OpportunitySkill>()
        };
    }

    [Fact]
    public async Task GetAll_InvalidType_ReturnsBadRequest()
    {
        using var db = CreateDb(nameof(GetAll_InvalidType_ReturnsBadRequest));
        var controller = CreateController(db, "student-1");

        var result = await controller.GetAll(
            q: null,
            type: "FakeType",
            level: null,
            remote: null,
            location: null,
            skills: null,
            minPay: null,
            maxPay: null,
            applicantCount: 0
        );

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Invalid type.", badRequest.Value);
    }

    [Fact]
    public async Task GetAll_InvalidLevel_ReturnsBadRequest()
    {
        using var db = CreateDb(nameof(GetAll_InvalidLevel_ReturnsBadRequest));
        var controller = CreateController(db, "student-1");

        var result = await controller.GetAll(
            q: null,
            type: null,
            level: "FakeLevel",
            remote: null,
            location: null,
            skills: null,
            minPay: null,
            maxPay: null,
            applicantCount: 0
        );

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Invalid level.", badRequest.Value);
    }

    [Fact]
    public async Task GetAll_ExcludesClosedOpportunities()
    {
        using var db = CreateDb(nameof(GetAll_ExcludesClosedOpportunities));

        db.Opportunities.Add(CreateOpportunity(1, "Open Role", "Jobify", closed: false));
        db.Opportunities.Add(CreateOpportunity(2, "Closed Role", "Jobify", closed: true));
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.GetAll(
            q: null,
            type: null,
            level: null,
            remote: null,
            location: null,
            skills: null,
            minPay: null,
            maxPay: null,
            applicantCount: 0
        );

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var paged = Assert.IsType<PagedResult<OpportunityCardDto>>(ok.Value);

        Assert.Single(paged.Items);
        Assert.Equal("Open Role", paged.Items[0].Title);
    }

    [Fact]
    public async Task GetAll_RemoteFilter_ReturnsOnlyMatchingResults()
    {
        using var db = CreateDb(nameof(GetAll_RemoteFilter_ReturnsOnlyMatchingResults));

        db.Opportunities.Add(CreateOpportunity(1, "Remote Role", "Jobify", remote: true));
        db.Opportunities.Add(CreateOpportunity(2, "Onsite Role", "Jobify", remote: false));
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.GetAll(
            q: null,
            type: null,
            level: null,
            remote: true,
            location: null,
            skills: null,
            minPay: null,
            maxPay: null,
            applicantCount: 0
        );

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var paged = Assert.IsType<PagedResult<OpportunityCardDto>>(ok.Value);

        Assert.Single(paged.Items);
        Assert.True(paged.Items[0].IsRemote);
    }

    [Fact]
    public async Task GetAll_LocationFilter_ReturnsOnlyMatchingResults()
    {
        using var db = CreateDb(nameof(GetAll_LocationFilter_ReturnsOnlyMatchingResults));

        db.Opportunities.Add(CreateOpportunity(1, "Beirut Role", "Jobify", location: "Beirut"));
        db.Opportunities.Add(CreateOpportunity(2, "Tripoli Role", "Jobify", location: "Tripoli"));
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.GetAll(
            q: null,
            type: null,
            level: null,
            remote: null,
            location: "Beirut",
            skills: null,
            minPay: null,
            maxPay: null,
            applicantCount: 0
        );

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var paged = Assert.IsType<PagedResult<OpportunityCardDto>>(ok.Value);

        Assert.Single(paged.Items);
        Assert.Equal("Beirut Role", paged.Items[0].Title);
    }

    [Fact]
    public async Task Close_ReturnsBadRequest_When_AlreadyClosed()
    {
        using var db = CreateDb(nameof(Close_ReturnsBadRequest_When_AlreadyClosed));

        db.Opportunities.Add(CreateOpportunity(1, "Closed Role", "Jobify", "recruiter-1", closed: true));
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1", "Recruiter");

        var result = await controller.Close(1);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Opportunity already closed.", badRequest.Value);
    }

    [Fact]
    public async Task Reopen_ReturnsBadRequest_When_AlreadyOpen()
    {
        using var db = CreateDb(nameof(Reopen_ReturnsBadRequest_When_AlreadyOpen));

        db.Opportunities.Add(CreateOpportunity(1, "Open Role", "Jobify", "recruiter-1", closed: false));
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1", "Recruiter");

        var result = await controller.Reopen(1);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Opportunity is already open.", badRequest.Value);
    }

    [Fact]
    public async Task Delete_ReturnsNotFound_When_NotOwner()
    {
        using var db = CreateDb(nameof(Delete_ReturnsNotFound_When_NotOwner));

        db.Opportunities.Add(CreateOpportunity(1, "Backend Role", "Jobify", "other-recruiter"));
        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1", "Recruiter");

        var result = await controller.Delete(1);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_RemovesRelatedData_AndOpportunity()
    {
        using var db = CreateDb(nameof(Delete_RemovesRelatedData_AndOpportunity));

        var skill = new Skill { Id = 1, Name = "C#" };
        db.Skills.Add(skill);

        db.Opportunities.Add(CreateOpportunity(1, "Backend Role", "Jobify", "recruiter-1"));

        db.OpportunitySkills.Add(new OpportunitySkill
        {
            OpportunityId = 1,
            SkillId = 1
        });

        db.SavedOpportunities.Add(new SavedOpportunity
        {
            UserId = "student-1",
            OpportunityId = 1,
            SavedAtUtc = DateTime.UtcNow
        });

        db.OpportunityQuestions.Add(new OpportunityQuestion
        {
            OpportunityId = 1,
            Question = "Is this remote?",
            AskedAtUtc = DateTime.UtcNow
        });

        await db.SaveChangesAsync();

        var controller = CreateController(db, "recruiter-1", "Recruiter");

        var result = await controller.Delete(1);

        Assert.IsType<NoContentResult>(result);

        Assert.False(await db.Opportunities.AnyAsync(o => o.Id == 1));
        Assert.False(await db.OpportunitySkills.AnyAsync(x => x.OpportunityId == 1));
        Assert.False(await db.SavedOpportunities.AnyAsync(x => x.OpportunityId == 1));
        Assert.False(await db.OpportunityQuestions.AnyAsync(x => x.OpportunityId == 1));
    }
}
