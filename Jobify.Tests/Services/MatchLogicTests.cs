using System.Reflection;
using Xunit;
using Jobify.Api.Controllers;

namespace Jobify.Tests.Services;

public class MatchLogicTests
{
    private static object? InvokePrivateStatic(string methodName, params object[] args)
    {
        var method = typeof(OpportunitiesController).GetMethod(
            methodName,
            BindingFlags.NonPublic | BindingFlags.Static
        );

        Assert.NotNull(method);

        return method!.Invoke(null, args);
    }

    [Fact]
    public void Exact_Skill_Match_Should_Return_100()
    {
        var studentSkills = new List<string> { "C#", "React", "SQL" };
        var opportunitySkills = new List<string> { "C#", "React", "SQL" };

        var result = (int)InvokePrivateStatic(
            "CalculateMatchPercentage",
            studentSkills,
            opportunitySkills
        )!;

        Assert.Equal(100, result);
    }

    [Fact]
    public void No_Overlap_Should_Return_0()
    {
        var studentSkills = new List<string> { "Python", "Django" };
        var opportunitySkills = new List<string> { "C#", "React", "SQL" };

        var result = (int)InvokePrivateStatic(
            "CalculateMatchPercentage",
            studentSkills,
            opportunitySkills
        )!;

        Assert.Equal(0, result);
    }

    [Fact]
    public void Partial_Overlap_Should_Return_Correct_Percentage()
    {
        var studentSkills = new List<string> { "C#", "Python", "SQL" };
        var opportunitySkills = new List<string> { "C#", "React", "SQL", "Docker" };

        var result = (int)InvokePrivateStatic(
            "CalculateMatchPercentage",
            studentSkills,
            opportunitySkills
        )!;

        Assert.Equal(50, result);
    }

    [Fact]
    public void Case_Differences_Should_Still_Match()
    {
        var studentSkills = new List<string> { "c#", "react", "sql" };
        var opportunitySkills = new List<string> { "C#", "React", "SQL" };

        var result = (int)InvokePrivateStatic(
            "CalculateMatchPercentage",
            studentSkills,
            opportunitySkills
        )!;

        Assert.Equal(100, result);
    }

    [Fact]
    public void Duplicate_Student_Skills_Should_Not_Inflate_Match()
    {
        var studentSkills = new List<string> { "C#", "C#", "React", "React" };
        var opportunitySkills = new List<string> { "C#", "React", "SQL" };

        var result = (int)InvokePrivateStatic(
            "CalculateMatchPercentage",
            studentSkills,
            opportunitySkills
        )!;

        Assert.Equal(67, result);
    }

    [Fact]
    public void Duplicate_Opportunity_Skills_Should_Not_Inflate_Match()
    {
        var studentSkills = new List<string> { "C#", "React" };
        var opportunitySkills = new List<string> { "C#", "C#", "React", "React" };

        var result = (int)InvokePrivateStatic(
            "CalculateMatchPercentage",
            studentSkills,
            opportunitySkills
        )!;

        Assert.Equal(100, result);
    }

    [Fact]
    public void Empty_Opportunity_Skills_Should_Return_0()
    {
        var studentSkills = new List<string> { "C#", "React" };
        var opportunitySkills = new List<string>();

        var result = (int)InvokePrivateStatic(
            "CalculateMatchPercentage",
            studentSkills,
            opportunitySkills
        )!;

        Assert.Equal(0, result);
    }

    [Fact]
    public void Empty_Student_Skills_Should_Return_0()
    {
        var studentSkills = new List<string>();
        var opportunitySkills = new List<string> { "C#", "React" };

        var result = (int)InvokePrivateStatic(
            "CalculateMatchPercentage",
            studentSkills,
            opportunitySkills
        )!;

        Assert.Equal(0, result);
    }

    [Fact]
    public void Whitespace_Should_Be_Trimmed_Before_Matching()
    {
        var studentSkills = new List<string> { "  C#  ", " React " };
        var opportunitySkills = new List<string> { "C#", "React", "SQL" };

        var result = (int)InvokePrivateStatic(
            "CalculateMatchPercentage",
            studentSkills,
            opportunitySkills
        )!;

        Assert.Equal(67, result);
    }

    [Fact]
    public void Score_Should_Always_Be_Between_0_And_100()
    {
        var studentSkills = new List<string> { "C#", "React", "SQL" };
        var opportunitySkills = new List<string> { "C#", "React", "SQL", "Docker", "Git" };

        var result = (int)InvokePrivateStatic(
            "CalculateMatchPercentage",
            studentSkills,
            opportunitySkills
        )!;

        Assert.InRange(result, 0, 100);
    }
}