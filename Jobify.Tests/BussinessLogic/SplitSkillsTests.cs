using System.Reflection;
using Xunit;
using Jobify.Api.Controllers;

namespace Jobify.Tests.BussinessLogic;

public class SplitSkillsTests
{
    private static object? InvokePrivateStatic(string methodName, params object[] args)
    {
        var method = typeof(ApplicationController).GetMethod(
            methodName,
            BindingFlags.NonPublic | BindingFlags.Static
        );

        Assert.NotNull(method);

        return method!.Invoke(null, args);
    }

    [Fact]
    public void Comma_Separated_Skills_Should_Be_Split_Correctly()
    {
        var result = (List<string>)InvokePrivateStatic(
            "SplitSkills",
            "C#, React, SQL"
        )!;

        Assert.Equal(3, result.Count);
        Assert.Contains("C#", result);
        Assert.Contains("React", result);
        Assert.Contains("SQL", result);
    }

    [Fact]
    public void Semicolon_Separated_Skills_Should_Be_Split_Correctly()
    {
        var result = (List<string>)InvokePrivateStatic(
            "SplitSkills",
            "C#; React; SQL"
        )!;

        Assert.Equal(3, result.Count);
        Assert.Contains("C#", result);
        Assert.Contains("React", result);
        Assert.Contains("SQL", result);
    }

    [Fact]
    public void Pipe_Separated_Skills_Should_Be_Split_Correctly()
    {
        var result = (List<string>)InvokePrivateStatic(
            "SplitSkills",
            "C# | React | SQL"
        )!;

        Assert.Equal(3, result.Count);
        Assert.Contains("C#", result);
        Assert.Contains("React", result);
        Assert.Contains("SQL", result);
    }

    [Fact]
    public void Slash_Separated_Skills_Should_Be_Split_Correctly()
    {
        var result = (List<string>)InvokePrivateStatic(
            "SplitSkills",
            "C#/React/SQL"
        )!;

        Assert.Equal(3, result.Count);
        Assert.Contains("C#", result);
        Assert.Contains("React", result);
        Assert.Contains("SQL", result);
    }

    [Fact]
    public void Newline_Separated_Skills_Should_Be_Split_Correctly()
    {
        var result = (List<string>)InvokePrivateStatic(
            "SplitSkills",
            "C#\nReact\nSQL"
        )!;

        Assert.Equal(3, result.Count);
        Assert.Contains("C#", result);
        Assert.Contains("React", result);
        Assert.Contains("SQL", result);
    }

    [Fact]
    public void Mixed_Separators_Should_Be_Split_Correctly()
    {
        var result = (List<string>)InvokePrivateStatic(
            "SplitSkills",
            "C#, React; SQL | Docker / Git"
        )!;

        Assert.Equal(5, result.Count);
        Assert.Contains("C#", result);
        Assert.Contains("React", result);
        Assert.Contains("SQL", result);
        Assert.Contains("Docker", result);
        Assert.Contains("Git", result);
    }

    [Fact]
    public void Whitespace_Should_Be_Trimmed()
    {
        var result = (List<string>)InvokePrivateStatic(
            "SplitSkills",
            "  C#  ,   React   , SQL  "
        )!;

        Assert.Contains("C#", result);
        Assert.Contains("React", result);
        Assert.Contains("SQL", result);
    }

    [Fact]
    public void Duplicate_Skills_Should_Be_Removed()
    {
        var result = (List<string>)InvokePrivateStatic(
            "SplitSkills",
            "C#, React, C#, react, SQL"
        )!;

        Assert.Equal(3, result.Count);
        Assert.Contains("C#", result);
        Assert.Contains("React", result);
        Assert.Contains("SQL", result);
    }

    [Fact]
    public void Empty_String_Should_Return_Empty_List()
    {
        var result = (List<string>)InvokePrivateStatic(
            "SplitSkills",
            ""
        )!;

        Assert.Empty(result);
    }

    [Fact]
    public void Null_Input_Should_Return_Empty_List()
    {
        var result = (List<string>)InvokePrivateStatic(
            "SplitSkills",
            new object?[] { null! }
        )!;

        Assert.Empty(result);
    }
}