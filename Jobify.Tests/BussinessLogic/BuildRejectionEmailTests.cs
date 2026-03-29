using System.Reflection;
using Xunit;
using Jobify.Api.Controllers;

namespace Jobify.Tests.BussinessLogic;

public class BuildRejectionEmailTests
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
    public void Email_Should_Contain_Candidate_Name_Opportunity_And_Company()
    {
        var html = (string)InvokePrivateStatic(
            "BuildRejectionEmail",
            "Waed",
            "Software Engineer Intern",
            "Jobify",
            null!
        )!;

        Assert.Contains("Waed", html);
        Assert.Contains("Software Engineer Intern", html);
        Assert.Contains("Jobify", html);
    }

    [Fact]
    public void Email_Should_Include_Reason_When_Provided()
    {
        var html = (string)InvokePrivateStatic(
            "BuildRejectionEmail",
            "Waed",
            "Software Engineer Intern",
            "Jobify",
            "We selected a candidate with more backend experience."
        )!;

        Assert.Contains("Feedback:", html);
        Assert.Contains("more backend experience", html);
    }

    [Fact]
    public void Email_Should_Not_Include_Feedback_Block_When_Reason_Is_Null()
    {
        var html = (string)InvokePrivateStatic(
            "BuildRejectionEmail",
            "Waed",
            "Software Engineer Intern",
            "Jobify",
            null!
        )!;

        Assert.DoesNotContain("Feedback:", html);
    }

    [Fact]
    public void Email_Should_Html_Encode_User_Input()
    {
        var html = (string)InvokePrivateStatic(
            "BuildRejectionEmail",
            "<script>alert('x')</script>",
            "<b>Role</b>",
            "<i>Company</i>",
            "<img src=x onerror=alert(1)>"
        )!;

        Assert.DoesNotContain("<script>", html);
        Assert.DoesNotContain("<b>Role</b>", html);
        Assert.DoesNotContain("<i>Company</i>", html);
        Assert.DoesNotContain("<img", html);
    }

    [Fact]
    public void Email_Should_Contain_Jobify_Branding()
    {
        var html = (string)InvokePrivateStatic(
            "BuildRejectionEmail",
            "Waed",
            "Software Engineer Intern",
            "Jobify",
            null!
        )!;

        Assert.Contains("Jobify", html);
        Assert.Contains("Application Status Update", html);
    }

    [Fact]
    public void Email_Should_Contain_Do_Not_Reply_Message()
    {
        var html = (string)InvokePrivateStatic(
            "BuildRejectionEmail",
            "Waed",
            "Software Engineer Intern",
            "Jobify",
            null!
        )!;

        Assert.Contains("please do not reply", html, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Email_Should_Contain_Current_Year()
    {
        var html = (string)InvokePrivateStatic(
            "BuildRejectionEmail",
            "Waed",
            "Software Engineer Intern",
            "Jobify",
            null!
        )!;

        Assert.Contains(DateTime.UtcNow.Year.ToString(), html);
    }

    [Fact]
    public void Email_Should_Return_Non_Empty_Html()
    {
        var html = (string)InvokePrivateStatic(
            "BuildRejectionEmail",
            "Waed",
            "Software Engineer Intern",
            "Jobify",
            null!
        )!;

        Assert.False(string.IsNullOrWhiteSpace(html));
        Assert.Contains("<html", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("</html>", html, StringComparison.OrdinalIgnoreCase);
    }
}