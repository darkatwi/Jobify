using System.Reflection;
using Xunit;
using Jobify.Api.Controllers;

namespace Jobify.Tests.Services;

public class ProfileFileValidationTests
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
    public void SafeExt_Should_Return_Extension_For_Normal_File()
    {
        var result = (string)InvokePrivateStatic("SafeExt", new object?[] { "resume.pdf" })!;

        Assert.Equal(".pdf", result);
    }

    [Fact]
    public void SafeExt_Should_Return_Empty_When_No_Extension()
    {
        var result = (string)InvokePrivateStatic("SafeExt", new object?[] { "resume" })!;

        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void SafeExt_Should_Return_Empty_For_Too_Long_Extension()
    {
        var result = (string)InvokePrivateStatic("SafeExt", new object?[] { "file.veryverylongextension" })!;

        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void SafeExt_Should_Handle_Null_Or_Empty_FileName()
    {
        var result1 = (string)InvokePrivateStatic("SafeExt", new object?[] { "" })!;
        var result2 = (string)InvokePrivateStatic("SafeExt", new object?[] { null })!;

        Assert.Equal(string.Empty, result1);
        Assert.Equal(string.Empty, result2);
    }

    [Theory]
    [InlineData("application/pdf", ".pdf", true)]
    [InlineData("application/msword", ".doc", true)]
    [InlineData("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx", true)]
    [InlineData("text/plain", ".txt", false)]
    [InlineData("image/png", ".png", false)]
    public void IsAllowedResumeType_Should_Validate_Correctly(string contentType, string ext, bool expected)
    {
        var result = (bool)InvokePrivateStatic(
            "IsAllowedResumeType",
            new object?[] { contentType, ext }
        )!;

        Assert.Equal(expected, result);
    }

    [Fact]
    public void IsAllowedResumeType_Should_Allow_By_Extension_Even_If_ContentType_Is_Empty()
    {
        var result = (bool)InvokePrivateStatic(
            "IsAllowedResumeType",
            new object?[] { "", ".pdf" }
        )!;

        Assert.True(result);
    }

    [Fact]
    public void IsAllowedResumeType_Should_Be_Case_Insensitive_For_Extension()
    {
        var result = (bool)InvokePrivateStatic(
            "IsAllowedResumeType",
            new object?[] { "application/octet-stream", ".PDF" }
        )!;

        Assert.True(result);
    }


    [Theory]
    [InlineData("image/png", ".png", true)]
    [InlineData("image/jpeg", ".jpg", true)]
    [InlineData("application/pdf", ".pdf", true)]
    [InlineData("text/plain", ".txt", false)]
    [InlineData("application/msword", ".doc", false)]
    public void IsAllowedProofType_Should_Validate_Correctly(string contentType, string ext, bool expected)
    {
        var result = (bool)InvokePrivateStatic(
            "IsAllowedProofType",
            new object?[] { contentType, ext }
        )!;

        Assert.Equal(expected, result);
    }

    [Fact]
    public void IsAllowedProofType_Should_Allow_Image_ContentType_Even_Without_Strong_Extension()
    {
        var result = (bool)InvokePrivateStatic(
            "IsAllowedProofType",
            new object?[] { "image/png", ".weird" }
        )!;

        Assert.True(result);
    }

    [Fact]
    public void IsAllowedProofType_Should_Be_Case_Insensitive_For_Extension()
    {
        var result = (bool)InvokePrivateStatic(
            "IsAllowedProofType",
            new object?[] { "application/octet-stream", ".JPG" }
        )!;

        Assert.True(result);
    }
}
