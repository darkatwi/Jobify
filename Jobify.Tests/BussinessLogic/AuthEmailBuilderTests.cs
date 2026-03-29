using System.Reflection;
using Xunit;
using Jobify.Api.Controllers;
using Microsoft.Extensions.Configuration;

namespace Jobify.Tests.BussinessLogic;

public class AuthEmailBuilderTests
{
    private static AuthController CreateController()
    {
        var settings = new Dictionary<string, string?>
        {
            ["Frontend:BaseUrl"] = "https://frontend.test",
            ["FrontendUrl"] = "https://frontend.test"
        };

        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();

        return (AuthController)Activator.CreateInstance(
            typeof(AuthController),
            new object?[] { null, null, null, null, config, null, null }
        )!;
    }

    private static object? InvokePrivate(string methodName, object?[]? args)
    {
        var method = typeof(AuthController).GetMethod(
            methodName,
            BindingFlags.NonPublic | BindingFlags.Instance
        );

        Assert.NotNull(method);

        var controller = CreateController();

        return method!.Invoke(controller, args);
    }

    [Fact]
    public void BuildRecruiterConfirmEmail_Should_Contain_Link()
    {
        var link = "https://test.com/confirm";

        var html = (string)InvokePrivate(
            "BuildRecruiterConfirmEmail",
            new object?[] { link }
        )!;

        Assert.Contains(link, html);
        Assert.Contains("Confirm Email", html);
    }

    [Fact]
    public void BuildRecruiterConfirmEmail_Should_Not_Be_Empty()
    {
        var html = (string)InvokePrivate(
            "BuildRecruiterConfirmEmail",
            new object?[] { "link" }
        )!;

        Assert.False(string.IsNullOrWhiteSpace(html));
    }

    [Fact]
    public void BuildRecruiterApprovedEmail_Should_Contain_CompanyName()
    {
        var html = (string)InvokePrivate(
            "BuildRecruiterApprovedEmail",
            new object?[] { "Jobify Inc" }
        )!;

        Assert.Contains("Jobify Inc", html);
        Assert.Contains("approved", html.ToLower());
    }

    [Fact]
    public void BuildRecruiterApprovedEmail_Should_Handle_Empty_Name()
    {
        var html = (string)InvokePrivate(
            "BuildRecruiterApprovedEmail",
            new object?[] { "" }
        )!;

        Assert.Contains("organization", html.ToLower());
    }

    [Fact]
    public void BuildRecruiterRejectedEmail_Should_Contain_Reason()
    {
        var html = (string)InvokePrivate(
            "BuildRecruiterRejectedEmail",
            new object?[] { "TestCo", "Invalid docs" }
        )!;

        Assert.Contains("Invalid docs", html);
        Assert.Contains("TestCo", html);
    }

    [Fact]
    public void BuildRecruiterRejectedEmail_Should_Default_Reason()
    {
        var html = (string)InvokePrivate(
            "BuildRecruiterRejectedEmail",
            new object?[] { "TestCo", "" }
        )!;

        Assert.Contains("could not be verified", html.ToLower());
    }

    [Fact]
    public void BuildResetPasswordEmail_Should_Contain_Link()
    {
        var link = "https://reset.com";

        var html = (string)InvokePrivate(
            "BuildResetPasswordEmail",
            new object?[] { "Waed", link }
        )!;

        Assert.Contains(link, html);
        Assert.Contains("reset password", html.ToLower());
    }

    [Fact]
    public void BuildResetPasswordEmail_Should_Contain_Name()
    {
        var html = (string)InvokePrivate(
            "BuildResetPasswordEmail",
            new object?[] { "Waed", "link" }
        )!;

        Assert.Contains("Waed", html);
    }

    [Fact]
    public void Emails_Should_Not_Contain_Null()
    {
        var html1 = (string)InvokePrivate(
            "BuildRecruiterApprovedEmail",
            new object?[] { null }
        )!;

        var html2 = (string)InvokePrivate(
            "BuildRecruiterRejectedEmail",
            new object?[] { null, null }
        )!;

        Assert.DoesNotContain("null", html1.ToLower());
        Assert.DoesNotContain("null", html2.ToLower());
    }
}