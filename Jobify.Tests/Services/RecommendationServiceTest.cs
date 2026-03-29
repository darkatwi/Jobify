using Xunit;
using Jobify.Api.Services;
using Jobify.Api.Models;
using Jobify.Api.DTOs;

namespace Jobify.Tests.Services;

public class RecommendationServiceTests
{
    private RecommendationService service = new();

    private Opportunity CreateOpportunity(params string[] skills)
    {
        return new Opportunity
        {
            Id = 1,
            Title = "Test Job",
            OpportunitySkills = skills.Select(s => new OpportunitySkill
            {
                Skill = new Skill { Name = s }
            }).ToList()
        };
    }

    private List<SkillInputDto> Applicant(params (string name, double weight)[] skills)
    {
        return skills.Select(s => new SkillInputDto
        {
            Name = s.name,
            Weight = s.weight
        }).ToList();
    }

    [Fact]
    public void Perfect_Match_Should_Return_100_Percent()
    {
        var opp = CreateOpportunity("c#", "react");

        var applicant = Applicant(("c#", 1), ("react", 1));

        var result = service.CalculateOpportunityPercentage(applicant, opp);

        Assert.Equal(100, result);
    }

    [Fact]
    public void No_Match_Should_Return_0()
    {
        var opp = CreateOpportunity("python", "django");

        var applicant = Applicant(("c#", 1));

        var result = service.CalculateOpportunityPercentage(applicant, opp);

        Assert.Equal(0, result);
    }

    [Fact]
    public void Partial_Match_Should_Return_Correct_Percentage()
    {
        var opp = CreateOpportunity("c#", "react", "sql");

        var applicant = Applicant(("c#", 1));

        var result = service.CalculateOpportunityPercentage(applicant, opp);

        Assert.Equal(33.33, result);
    }

    [Fact]
    public void Synonyms_Should_Match()
    {
        var opp = CreateOpportunity("javascript");

        var applicant = Applicant(("js", 1));

        var result = service.CalculateOpportunityPercentage(applicant, opp);

        Assert.Equal(100, result);
    }

    [Fact]
    public void Empty_Opportunity_Should_Return_0()
    {
        var opp = new Opportunity
        {
            OpportunitySkills = new List<OpportunitySkill>()
        };

        var applicant = Applicant(("c#", 1));

        var result = service.CalculateOpportunityPercentage(applicant, opp);

        Assert.Equal(0, result);
    }

    [Fact]
    public void Recommend_Should_Return_Only_Matching_Opportunities()
    {
        var opp1 = CreateOpportunity("c#");
        var opp2 = CreateOpportunity("python");

        var applicant = Applicant(("c#", 1));

        var result = service.Recommend(applicant, new List<Opportunity> { opp1, opp2 });

        Assert.Single(result);
        Assert.Equal(opp1.Id, result[0].OpportunityId);
    }

    [Fact]
    public void Recommend_Should_Sort_By_Score()
    {
        var opp1 = CreateOpportunity("c#", "react");
        var opp2 = CreateOpportunity("c#");

        var applicant = Applicant(("c#", 1));

        var result = service.Recommend(applicant, new List<Opportunity> { opp1, opp2 });

        Assert.True(result[0].Score >= result[1].Score);
    }

    [Fact]
    public void MatchedSkills_Should_Be_Returned()
    {
        var opp = CreateOpportunity("c#", "react");

        var applicant = Applicant(("c#", 1));

        var result = service.Recommend(applicant, new List<Opportunity> { opp });

        Assert.Contains("c#", result[0].MatchedSkills);
        Assert.DoesNotContain("react", result[0].MatchedSkills);
    }

    [Fact]
    public void Duplicate_Applicant_Skills_Should_Not_Break_Score()
    {
        var opp = CreateOpportunity("c#");

        var applicant = Applicant(("c#", 1), ("c#", 1));

        var result = service.CalculateOpportunityPercentage(applicant, opp);

        Assert.Equal(100, result);
    }
}