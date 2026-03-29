using Jobify.Api.Controllers;
using Jobify.Api.Data;
using Jobify.Api.DTOs;
using Jobify.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Xunit;

namespace Jobify.Tests.Controllers.OpportunitiesTests;

public class BasicTests
{
    private static AppDbContext CreateDb(string name)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(name)
            .Options;

        return new AppDbContext(options);
    }

    private static OpportunitiesController CreateController(AppDbContext db, string? userId = null)
    {
        var controller = new OpportunitiesController(
            db,
            null!,
            null!,
            null!
        );

        var claims = new List<Claim>();
        if (!string.IsNullOrWhiteSpace(userId))
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId));
        }

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
            }
        };

        return controller;
    }

    private static Opportunity CreateOpportunity(int id, string title, string company, bool closed = false)
    {
        return new Opportunity
        {
            Id = id,
            Title = title,
            CompanyName = company,
            RecruiterUserId = "recruiter-1",
            Type = OpportunityType.Job,
            Level = ExperienceLevel.Entry,
            WorkMode = WorkMode.OnSite,
            CreatedAtUtc = DateTime.UtcNow,
            IsClosed = closed,
            OpportunitySkills = new List<OpportunitySkill>()
        };
    }

    [Fact]
    public async Task GetById_NotFound()
    {
        using var db = CreateDb(nameof(GetById_NotFound));
        var controller = CreateController(db);

        var result = await controller.GetById(1);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetById_ReturnsOpportunity()
    {
        using var db = CreateDb(nameof(GetById_ReturnsOpportunity));

        var opp = CreateOpportunity(1, "Backend Intern", "Jobify");
        opp.Description = "Build APIs";

        db.Opportunities.Add(opp);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.GetById(1);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<OpportunityDetailsDto>(ok.Value);

        Assert.Equal(1, dto.Id);
        Assert.Equal("Backend Intern", dto.Title);
        Assert.Equal("Jobify", dto.CompanyName);
        Assert.Equal("Build APIs", dto.Description);
    }

    [Fact]
    public async Task GetByCompany_ReturnsOnlyMatchingCompany()
    {
        using var db = CreateDb(nameof(GetByCompany_ReturnsOnlyMatchingCompany));

        db.Opportunities.Add(CreateOpportunity(1, "Backend", "Jobify"));
        db.Opportunities.Add(CreateOpportunity(2, "Frontend", "OtherCo"));
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var result = await controller.GetByCompany("Jobify");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<List<OpportunityCardDto>>(ok.Value);

        Assert.Single(list);
        Assert.Equal("Jobify", list[0].CompanyName);
    }

    [Fact]
    public async Task GetByCompany_ExcludesClosedOpportunities()
    {
        using var db = CreateDb(nameof(GetByCompany_ExcludesClosedOpportunities));

        db.Opportunities.Add(CreateOpportunity(1, "Open Role", "Jobify", closed: false));
        db.Opportunities.Add(CreateOpportunity(2, "Closed Role", "Jobify", closed: true));
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var result = await controller.GetByCompany("Jobify");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<List<OpportunityCardDto>>(ok.Value);

        Assert.Single(list);
        Assert.Equal("Open Role", list[0].Title);
    }

    [Fact]
    public async Task GetByCompany_EmptyName_ReturnsBadRequest()
    {
        using var db = CreateDb(nameof(GetByCompany_EmptyName_ReturnsBadRequest));
        var controller = CreateController(db);

        var result = await controller.GetByCompany("");

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Company name required.", badRequest.Value);
    }

    [Fact]
    public async Task GetSimilar_NotFound()
    {
        using var db = CreateDb(nameof(GetSimilar_NotFound));
        var controller = CreateController(db);

        var result = await controller.GetSimilar(1);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetSimilar_ReturnsResults()
    {
        using var db = CreateDb(nameof(GetSimilar_ReturnsResults));

        var skill1 = new Skill { Id = 1, Name = "C#" };
        var skill2 = new Skill { Id = 2, Name = "SQL" };

        db.Skills.AddRange(skill1, skill2);

        var baseOpp = CreateOpportunity(1, "Backend", "Jobify");
        var similar = CreateOpportunity(2, "Backend 2", "Jobify");

        baseOpp.OpportunitySkills.Add(new OpportunitySkill { OpportunityId = 1, SkillId = 1, Skill = skill1 });
        baseOpp.OpportunitySkills.Add(new OpportunitySkill { OpportunityId = 1, SkillId = 2, Skill = skill2 });

        similar.OpportunitySkills.Add(new OpportunitySkill { OpportunityId = 2, SkillId = 1, Skill = skill1 });

        db.Opportunities.AddRange(baseOpp, similar);
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var result = await controller.GetSimilar(1);

        var list = Assert.IsAssignableFrom<List<OpportunityCardDto>>(result.Value);
        Assert.NotEmpty(list);
        Assert.Contains(list, x => x.Id == 2);
    }

    [Fact]
    public async Task GetSimilar_ExcludesClosedOpportunities()
    {
        using var db = CreateDb(nameof(GetSimilar_ExcludesClosedOpportunities));

        var skill1 = new Skill { Id = 1, Name = "C#" };
        db.Skills.Add(skill1);

        var baseOpp = CreateOpportunity(1, "Backend", "Jobify");
        var openSimilar = CreateOpportunity(2, "Open Similar", "Jobify", closed: false);
        var closedSimilar = CreateOpportunity(3, "Closed Similar", "Jobify", closed: true);

        baseOpp.OpportunitySkills.Add(new OpportunitySkill { OpportunityId = 1, SkillId = 1, Skill = skill1 });
        openSimilar.OpportunitySkills.Add(new OpportunitySkill { OpportunityId = 2, SkillId = 1, Skill = skill1 });
        closedSimilar.OpportunitySkills.Add(new OpportunitySkill { OpportunityId = 3, SkillId = 1, Skill = skill1 });

        db.Opportunities.AddRange(baseOpp, openSimilar, closedSimilar);
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var result = await controller.GetSimilar(1);

        var list = Assert.IsAssignableFrom<List<OpportunityCardDto>>(result.Value);

        Assert.Contains(list, x => x.Id == 2);
        Assert.DoesNotContain(list, x => x.Id == 3);
    }
}