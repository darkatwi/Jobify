using Xunit;

namespace Jobify.Tests.BussinessLogic;

public class AssessmentScoringTests
{
    private static string BuildAssessmentJson()
    {
        return """
        {
            "questions": [
                { "id": "q1", "type": "mcq", "correctIndex": 1 },
                { "id": "q2", "type": "mcq", "correctIndex": 0 },
                { "id": "q3", "type": "mcq", "correctIndex": 2 }
            ]
        }
        """;
    }

    [Fact]
    public void All_Correct_Should_Return_100()
    {
        var assessment = BuildAssessmentJson();

        var answers = """
        {
            "q1": 1,
            "q2": 0,
            "q3": 2
        }
        """;

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.Equal(100m, score);
    }

    [Fact]
    public void None_Correct_Should_Return_0()
    {
        var assessment = BuildAssessmentJson();

        var answers = """
        {
            "q1": 0,
            "q2": 2,
            "q3": 1
        }
        """;

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.Equal(0m, score);
    }

    [Fact]
    public void Partial_Correct_Should_Return_Correct_Percentage()
    {
        var assessment = BuildAssessmentJson();

        var answers = """
        {
            "q1": 1,
            "q2": 2,
            "q3": 0
        }
        """;

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.Equal(33.33m, score);
    }

    [Fact]
    public void Two_Out_Of_Three_Correct_Should_Return_66_67()
    {
        var assessment = BuildAssessmentJson();

        var answers = """
        {
            "q1": 1,
            "q2": 0,
            "q3": 0
        }
        """;

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.Equal(66.67m, score);
    }

    [Fact]
    public void Missing_Answers_Should_Not_Crash()
    {
        var assessment = BuildAssessmentJson();

        var answers = "{}";

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.Equal(0m, score);
    }

    [Fact]
    public void Null_Or_Empty_Answers_Should_Return_0()
    {
        var assessment = BuildAssessmentJson();

        var score1 = AssessmentScoringHelper.ComputeMcqScore(assessment, "");
        var score2 = AssessmentScoringHelper.ComputeMcqScore(assessment, null!);

        Assert.Equal(0m, score1);
        Assert.Equal(0m, score2);
    }

    [Fact]
    public void No_Mcq_Questions_Should_Return_0()
    {
        var assessment = """
        {
            "questions": [
                { "id": "c1", "type": "code" }
            ]
        }
        """;

        var answers = "{}";

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.Equal(0m, score);
    }

    [Fact]
    public void Mixed_Questions_Should_Grade_Only_Mcqs()
    {
        var assessment = """
        {
            "questions": [
                { "id": "q1", "type": "mcq", "correctIndex": 1 },
                { "id": "c1", "type": "code" },
                { "id": "q2", "type": "mcq", "correctIndex": 0 }
            ]
        }
        """;

        var answers = """
        {
            "q1": 1,
            "q2": 0,
            "c1": 123
        }
        """;

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.Equal(100m, score);
    }

    [Fact]
    public void Missing_CorrectIndex_Should_Skip_Question()
    {
        var assessment = """
        {
            "questions": [
                { "id": "q1", "type": "mcq", "correctIndex": 1 },
                { "id": "q2", "type": "mcq" }
            ]
        }
        """;

        var answers = """
        {
            "q1": 1,
            "q2": 0
        }
        """;

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.Equal(100m, score);
    }

    [Fact]
    public void Missing_Question_Id_Should_Skip_Question()
    {
        var assessment = """
        {
            "questions": [
                { "id": "q1", "type": "mcq", "correctIndex": 1 },
                { "type": "mcq", "correctIndex": 0 }
            ]
        }
        """;

        var answers = """
        {
            "q1": 1
        }
        """;

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.Equal(100m, score);
    }

    [Fact]
    public void NonNumeric_Answer_Should_Not_Count_As_Correct()
    {
        var assessment = BuildAssessmentJson();

        var answers = """
        {
            "q1": "1",
            "q2": 0,
            "q3": 2
        }
        """;

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.Equal(66.67m, score);
    }

    [Fact]
    public void Missing_Questions_Array_Should_Return_0()
    {
        var assessment = """
        {
            "timeLimitSeconds": 1800
        }
        """;

        var answers = "{}";

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.Equal(0m, score);
    }

    [Fact]
    public void Empty_Questions_Array_Should_Return_0()
    {
        var assessment = """
        {
            "questions": []
        }
        """;

        var answers = "{}";

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.Equal(0m, score);
    }

    [Fact]
    public void Invalid_Answers_Json_Should_Not_Crash()
    {
        var assessment = BuildAssessmentJson();

        var answers = "INVALID_JSON";

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.Equal(0m, score);
    }

    [Fact]
    public void Invalid_Assessment_Json_Should_Not_Crash()
    {
        var assessment = "INVALID_JSON";
        var answers = "{}";

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.Equal(0m, score);
    }

    [Fact]
    public void Score_Should_Always_Be_Between_0_And_100()
    {
        var assessment = BuildAssessmentJson();

        var answers = """
        {
            "q1": 1,
            "q2": 0,
            "q3": 2
        }
        """;

        var score = AssessmentScoringHelper.ComputeMcqScore(assessment, answers);

        Assert.InRange(score, 0m, 100m);
    }
}