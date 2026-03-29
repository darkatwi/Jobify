using Jobify.Api.Helpers;
using Xunit;

namespace Jobify.Tests.BussinessLogic;

public class ApplicationStatusHelperTests
{
    [Theory]
    [InlineData("Draft", "Submitted", true)]
    [InlineData("Draft", "Withdrawn", true)]
    [InlineData("Submitted", "InReview", true)]
    [InlineData("Submitted", "Withdrawn", true)]
    [InlineData("InReview", "Shortlisted", true)]
    [InlineData("InReview", "Rejected", true)]
    [InlineData("InReview", "Withdrawn", true)]
    [InlineData("Shortlisted", "InterviewScheduled", true)]
    [InlineData("Shortlisted", "Rejected", true)]
    [InlineData("Shortlisted", "Withdrawn", true)]
    [InlineData("InterviewScheduled", "Accepted", true)]
    [InlineData("InterviewScheduled", "Rejected", true)]
    [InlineData("InterviewScheduled", "Withdrawn", true)]
    [InlineData("Accepted", "Draft", false)]
    [InlineData("Accepted", "Rejected", false)]
    [InlineData("Rejected", "InterviewScheduled", false)]
    [InlineData("Rejected", "Accepted", false)]
    [InlineData("Withdrawn", "Shortlisted", false)]
    [InlineData("Withdrawn", "Accepted", false)]
    [InlineData("Draft", "Accepted", false)]
    [InlineData("Shortlisted", "Draft", false)]
    public void IsValidTransition_Should_Return_Expected_Result(
        string current,
        string next,
        bool expected)
    {
        var result = ApplicationStatusHelper.IsValidTransition(current, next);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("Draft")]
    [InlineData("Submitted")]
    [InlineData("InReview")]
    [InlineData("Shortlisted")]
    [InlineData("InterviewScheduled")]
    [InlineData("Accepted")]
    [InlineData("Rejected")]
    [InlineData("Withdrawn")]
    public void IsKnownStatus_Should_Return_True_For_Known_Statuses(string status)
    {
        var result = ApplicationStatusHelper.IsKnownStatus(status);

        Assert.True(result);
    }

    [Theory]
    [InlineData("Pending")]
    [InlineData("Done")]
    [InlineData("")]
    [InlineData("123")]
    [InlineData("draft")]
    [InlineData(" submitted ")]
    [InlineData("Interview Scheduled")]
    public void IsKnownStatus_Should_Return_False_For_Unknown_Or_Malformed_Statuses(string status)
    {
        var result = ApplicationStatusHelper.IsKnownStatus(status);

        Assert.False(result);
    }

    [Theory]
    [InlineData(null, "Submitted")]
    [InlineData("Draft", null)]
    [InlineData(null, null)]
    [InlineData("", "Submitted")]
    [InlineData("Draft", "")]
    [InlineData("Unknown", "Submitted")]
    [InlineData("Draft", "Unknown")]
    public void IsValidTransition_Should_Return_False_For_Invalid_Inputs(
        string? current,
        string? next)
    {
        var result = ApplicationStatusHelper.IsValidTransition(current, next);

        Assert.False(result);
    }
}