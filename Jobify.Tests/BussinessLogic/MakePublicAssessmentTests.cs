using System.Reflection;
using Xunit;
using Jobify.Api.Controllers;

namespace Jobify.Tests.BussinessLogic;

public class MakePublicAssessmentTests
{
    private static object? InvokeMakePublicAssessment(string? assessmentJson, List<string>? questionOrder = null)
    {
        var method = typeof(ApplicationController).GetMethod(
            "MakePublicAssessment",
            BindingFlags.NonPublic | BindingFlags.Static
        );

        Assert.NotNull(method);

        return method!.Invoke(null, new object?[] { assessmentJson, questionOrder });
    }

    private static object? GetProp(object obj, string propName)
    {
        return obj.GetType().GetProperty(propName)?.GetValue(obj);
    }

    [Fact]
    public void Null_Assessment_Should_Return_Null()
    {
        var result = InvokeMakePublicAssessment(null, null);

        Assert.Null(result);
    }

    [Fact]
    public void Empty_String_Should_Return_Null()
    {
        var result = InvokeMakePublicAssessment("", null);

        Assert.Null(result);
    }

    [Fact]
    public void Invalid_Json_Should_Return_Null()
    {
        var result = InvokeMakePublicAssessment("INVALID_JSON", null);

        Assert.Null(result);
    }

    [Fact]
    public void Old_Format_Should_Be_Returned_As_Is()
    {
        var json = """
        {
            "questions": [
                { "id": "q1", "type": "mcq", "correctIndex": 1 }
            ]
        }
        """;

        var result = InvokeMakePublicAssessment(json, null);

        Assert.NotNull(result);
    }

    [Fact]
    public void New_Format_Should_Convert_To_Questions()
    {
        var json = """
        {
            "timeLimitSeconds": 1800,
            "mcqs": [
                {
                    "prompt": "What is C#?",
                    "options": ["Language", "OS"]
                }
            ],
            "codingChallenges": [
                {
                    "title": "Sum",
                    "prompt": "Add numbers",
                    "starterCode": "print('hello')"
                }
            ]
        }
        """;

        var result = InvokeMakePublicAssessment(json, null);

        Assert.NotNull(result);

        var questions = GetProp(result!, "questions") as System.Collections.IEnumerable;
        Assert.NotNull(questions);

        var items = questions!.Cast<object>().ToList();
        Assert.Equal(2, items.Count);
    }

    [Fact]
    public void TimeLimit_Should_Be_Preserved()
    {
        var json = """
        {
            "timeLimitSeconds": 1200,
            "mcqs": []
        }
        """;

        var result = InvokeMakePublicAssessment(json, null);

        Assert.NotNull(result);

        var timeLimit = GetProp(result!, "timeLimitSeconds");
        Assert.Equal(1200, timeLimit);
    }

    [Fact]
    public void Question_Order_Should_Be_Applied_When_Provided()
    {
        var json = """
    {
        "mcqs": [
            { "prompt": "First?", "options": ["A", "B"] },
            { "prompt": "Second?", "options": ["C", "D"] }
        ],
        "codingChallenges": [
            { "title": "Code 1", "prompt": "Do thing", "starterCode": "" }
        ]
    }
    """;

        var order = new List<string> { "code-0", "mcq-1", "mcq-0" };

        var result = InvokeMakePublicAssessment(json, order);

        Assert.NotNull(result);

        var questions = GetProp(result!, "questions") as System.Collections.IEnumerable;
        Assert.NotNull(questions);

        var ids = questions!
            .Cast<Dictionary<string, object?>>()
            .Select(q => q["id"]?.ToString())
            .ToList();

        Assert.Equal(3, ids.Count);
        Assert.Equal("code-0", ids[0]);
        Assert.Equal("mcq-1", ids[1]);
        Assert.Equal("mcq-0", ids[2]);
    }

    [Fact]
    public void Missing_Mcq_And_Code_Should_Not_Crash()
    {
        var json = """
        {
            "timeLimitSeconds": 1800
        }
        """;

        var result = InvokeMakePublicAssessment(json, null);

        Assert.NotNull(result);

        var questions = GetProp(result!, "questions") as System.Collections.IEnumerable;
        Assert.NotNull(questions);
        Assert.Empty(questions!.Cast<object>());
    }

    [Fact]
    public void Mcq_Without_Options_Should_Still_Process()
    {
        var json = """
        {
            "mcqs": [
                {
                    "prompt": "Test question"
                }
            ]
        }
        """;

        var result = InvokeMakePublicAssessment(json, null);

        Assert.NotNull(result);

        var questions = GetProp(result!, "questions") as System.Collections.IEnumerable;
        Assert.NotNull(questions);

        var items = questions!.Cast<object>().ToList();
        Assert.Single(items);
    }

    [Fact]
    public void Coding_Only_Assessment_Should_Work()
    {
        var json = """
        {
            "codingChallenges": [
                {
                    "title": "Algo",
                    "prompt": "Solve this",
                    "starterCode": "print('x')"
                }
            ]
        }
        """;

        var result = InvokeMakePublicAssessment(json, null);

        Assert.NotNull(result);

        var questions = GetProp(result!, "questions") as System.Collections.IEnumerable;
        Assert.NotNull(questions);

        var items = questions!.Cast<object>().ToList();
        Assert.Single(items);
    }
}