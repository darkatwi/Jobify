using System.Reflection;
using Xunit;
using Jobify.Api.Controllers;

namespace Jobify.Tests.Services;

public class ProfileOcrHelperTests
{
    private static object? InvokePrivateStatic(string methodName, object?[]? args)
    {
        var method = typeof(ProfileController).GetMethod(
            methodName,
            BindingFlags.NonPublic | BindingFlags.Static
        );

        Assert.NotNull(method);

        return method!.Invoke(null, args);
    }

    [Fact]
    public void NormalizeText_Should_Lowercase_Remove_Punctuation_And_Compress_Spaces()
    {
        var input = "  American University of Beirut!!! \n\n Student-ID: 12345  ";
        var result = (string)InvokePrivateStatic("NormalizeText", new object?[] { input })!;

        Assert.Equal("american university of beirut student id 12345", result);
    }

    [Fact]
    public void NormalizeText_Should_Return_Empty_For_Null()
    {
        var result = (string)InvokePrivateStatic("NormalizeText", new object?[] { null })!;

        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void NormalizeText_Should_Return_Empty_For_Whitespace()
    {
        var result = (string)InvokePrivateStatic("NormalizeText", new object?[] { "   \n\t   " })!;

        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void NameLooksPresent_Should_Return_True_When_FirstName_Is_In_Ocr_Text()
    {
        var ocrText = "This document belongs to Waed Atwi, student at AUB.";
        var fullName = "Waed Atwi";

        var result = (bool)InvokePrivateStatic("NameLooksPresent", new object?[] { ocrText, fullName })!;

        Assert.True(result);
    }

    [Fact]
    public void NameLooksPresent_Should_Return_False_When_FirstName_Is_Missing()
    {
        var ocrText = "This document belongs to another student.";
        var fullName = "Waed Atwi";

        var result = (bool)InvokePrivateStatic("NameLooksPresent", new object?[] { ocrText, fullName })!;

        Assert.False(result);
    }

    [Fact]
    public void NameLooksPresent_Should_Be_Case_Insensitive()
    {
        var ocrText = "WAED is currently registered for Fall 2026.";
        var fullName = "Waed Atwi";

        var result = (bool)InvokePrivateStatic("NameLooksPresent", new object?[] { ocrText, fullName })!;

        Assert.True(result);
    }

    [Fact]
    public void NameLooksPresent_Should_Return_False_For_Short_FirstName()
    {
        var ocrText = "Al is a student at the university.";
        var fullName = "Al Test";

        var result = (bool)InvokePrivateStatic("NameLooksPresent", new object?[] { ocrText, fullName })!;

        Assert.False(result);
    }

    [Fact]
    public void NameLooksPresent_Should_Return_False_For_Null_Inputs()
    {
        var result1 = (bool)InvokePrivateStatic("NameLooksPresent", new object?[] { null, "Waed Atwi" })!;
        var result2 = (bool)InvokePrivateStatic("NameLooksPresent", new object?[] { "some text", null })!;

        Assert.False(result1);
        Assert.False(result2);
    }

    [Fact]
    public void ExtractUniversityName_Should_Find_University_Name()
    {
        var text = """
        Student Registration Certificate
        American University of Beirut
        Office of the Registrar
        """;

        var result = (string?)InvokePrivateStatic("ExtractUniversityName", new object?[] { text });

        Assert.NotNull(result);
        Assert.Contains("American University of Beirut", result);
    }

    [Fact]
    public void ExtractUniversityName_Should_Find_College_Name()
    {
        var text = """
        Lebanese International College
        Student ID Card
        """;

        var result = (string?)InvokePrivateStatic("ExtractUniversityName", new object?[] { text });

        Assert.NotNull(result);
        Assert.Contains("Lebanese International College", result);
    }

    [Fact]
    public void ExtractUniversityName_Should_Return_Null_When_Not_Found()
    {
        var text = """
        Student Registration Certificate
        Office of the Registrar
        Semester Fall 2026
        """;

        var result = (string?)InvokePrivateStatic("ExtractUniversityName", new object?[] { text });

        Assert.Null(result);
    }

    [Fact]
    public void ExtractUniversityName_Should_Return_Null_For_Empty_Text()
    {
        var result = (string?)InvokePrivateStatic("ExtractUniversityName", new object?[] { "" });

        Assert.Null(result);
    }
}