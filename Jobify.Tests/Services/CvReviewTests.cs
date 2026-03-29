using System.Reflection;
using Xunit;
using Jobify.Api.Services.Cv;
using Jobify.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using Moq;

namespace Jobify.Tests.Services;

public class CvReviewTests
{
    private CvReviewService CreateService(string dbName = "CvTestDb")
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        var db = new AppDbContext(options);

        var envMock = new Mock<IWebHostEnvironment>();
        envMock.Setup(e => e.WebRootPath).Returns("wwwroot");
        envMock.Setup(e => e.ContentRootPath).Returns(".");

        return new CvReviewService(db, envMock.Object);
    }

    private static object? InvokePrivateStatic(string methodName, params object[] args)
    {
        var method = typeof(CvReviewService).GetMethod(
            methodName,
            BindingFlags.NonPublic | BindingFlags.Static);

        Assert.NotNull(method);

        return method!.Invoke(null, args);
    }

    [Fact]
    public async Task Empty_Profile_Should_Return_Null()
    {
        var service = CreateService("CvTest_1");

        var result = await service.GenerateReviewAsync("non-existing-user");

        Assert.Null(result);
    }

    [Fact]
    public async Task Missing_Profile_Should_Not_Crash()
    {
        var service = CreateService("CvTest_2");

        var result = await service.GenerateReviewAsync("random-id");

        Assert.True(result == null || result.ResumeScore >= 0);
    }

    [Fact]
    public async Task Same_Input_Should_Produce_Same_Score()
    {
        var service = CreateService("CvTest_3");

        var r1 = await service.GenerateReviewAsync("user1");
        var r2 = await service.GenerateReviewAsync("user1");

        if (r1 != null && r2 != null)
        {
            Assert.Equal(r1.ResumeScore, r2.ResumeScore);
        }
    }

    [Fact]
    public async Task Repeated_Calls_Should_Not_Modify_State()
    {
        var service = CreateService("CvTest_4");

        var first = await service.GenerateReviewAsync("user1");
        var second = await service.GenerateReviewAsync("user1");

        if (first != null && second != null)
        {
            Assert.Equal(first.ResumeScore, second.ResumeScore);
            Assert.Equal(first.SectionChecks.HasSkillsSection, second.SectionChecks.HasSkillsSection);
            Assert.Equal(first.ContentQuality.BulletCount, second.ContentQuality.BulletCount);
        }
    }

    [Fact]
    public void NormalizeCvText_Should_Convert_Symbols_And_Insert_Headers_On_New_Lines()
    {
        var input = "John Doe\r\n● Built API\r\nSKILLS React, SQL\r\nEXPERIENCE Worked at X";
        var result = (string)InvokePrivateStatic("NormalizeCvText", input)!;

        Assert.Contains("• Built API", result);
        Assert.Contains("\nSKILLS", result);
        Assert.Contains("\nEXPERIENCE", result);
    }

    [Fact]
    public void NormalizeCvText_Should_Remove_Extra_Spaces_And_Compress_Blank_Lines()
    {
        var input = "SUMMARY   \r\n\r\n\r\n   Strong student   \r\n\r\n\r\nSKILLS";
        var result = (string)InvokePrivateStatic("NormalizeCvText", input)!;

        Assert.DoesNotContain("   ", result);
        Assert.DoesNotContain("\n\n\n", result);
    }

    [Theory]
    [InlineData("waed@example.com", true)]
    [InlineData("Contact me at waed.atwi@aub.edu.lb", true)]
    [InlineData("waed @ aub.edu.lb", false)]
    [InlineData("no email here", false)]
    public void HasEmail_Should_Detect_Valid_Emails(string text, bool expected)
    {
        var result = (bool)InvokePrivateStatic("HasEmail", text)!;

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("Jan 2025 - May 2025", true)]
    [InlineData("Expected 2027", true)]
    [InlineData("Worked during 2024", true)]
    [InlineData("No dates listed here", false)]
    public void HasDates_Should_Detect_Resume_Dates(string text, bool expected)
    {
        var result = (bool)InvokePrivateStatic("HasDates", text)!;

        Assert.Equal(expected, result);
    }

    [Fact]
    public void EstimatePages_Should_Return_One_For_Short_Text()
    {
        var text = "Short resume text";
        var result = (int)InvokePrivateStatic("EstimatePages", text)!;

        Assert.Equal(1, result);
    }

    [Fact]
    public void EstimatePages_Should_Increase_For_Long_Text()
    {
        var longText = new string('A', 7000);
        var result = (int)InvokePrivateStatic("EstimatePages", longText)!;

        Assert.True(result >= 2);
    }

    [Fact]
    public void CountBullets_Should_Count_Explicit_Bullets()
    {
        var text = """
                   EXPERIENCE
                   • Built API
                   • Improved SQL queries
                   • Deployed web app
                   """;

        var result = (int)InvokePrivateStatic("CountBullets", text)!;

        Assert.Equal(3, result);
    }

    [Fact]
    public void CountBullets_Should_Infer_Bullets_From_Action_Verbs_When_No_Bullet_Symbols_Exist()
    {
        var text = """
                   Built API for student platform
                   Developed recruiter dashboard
                   Implemented authentication flow
                   """;

        var result = (int)InvokePrivateStatic("CountBullets", text)!;

        Assert.Equal(3, result);
    }

    [Fact]
    public void CountActionVerbStarts_Should_Count_Valid_Action_Verbs()
    {
        var text = """
                   • Built a REST API
                   • Developed a React app
                   • Improved query performance
                   Helped team with testing
                   """;

        var result = (int)InvokePrivateStatic("CountActionVerbStarts", text)!;

        Assert.Equal(3, result);
    }

    [Theory]
    [InlineData("Increased response speed by 35%", true)]
    [InlineData("Served 5000 users and improved throughput", true)]
    [InlineData("Top 10 nationwide", true)]
    [InlineData("Worked on backend features", false)]
    [InlineData("2023 - 2024", false)]
    public void HasMeasurableAchievements_Should_Detect_Impact(string text, bool expected)
    {
        var result = (bool)InvokePrivateStatic("HasMeasurableAchievements", text)!;

        Assert.Equal(expected, result);
    }

    [Fact]
    public void DetectProjectCount_Should_Count_Project_Like_Titles()
    {
        var projectsText = """
                           Jobify (ASP.NET Core, React)
                           • Built a full-stack hiring platform
                           Smart Clinic System
                           • Developed patient scheduling module
                           Movie Recommender
                           • Implemented recommendation engine
                           """;

        var result = (int)InvokePrivateStatic(
            "DetectProjectCount",
            projectsText,
            projectsText,
            projectsText,
            true)!;

        Assert.True(result >= 2);
    }

    [Fact]
    public void CheckSectionOrder_Should_Return_True_For_Good_Order()
    {
        var text = """
                   summary
                   experience
                   education
                   projects
                   skills
                   """;

        var result = (bool)InvokePrivateStatic("CheckSectionOrder", text)!;

        Assert.True(result);
    }

    [Fact]
    public void CheckSectionOrder_Should_Return_False_For_Bad_Order()
    {
        var text = """
                   skills
                   projects
                   education
                   experience
                   summary
                   """;

        var result = (bool)InvokePrivateStatic("CheckSectionOrder", text)!;

        Assert.False(result);
    }

    [Fact]
    public void ExtractSections_Should_Find_Expected_Sections()
    {
        var text = """
                   SUMMARY
                   Software engineering student

                   EXPERIENCE
                   Built Jobify platform

                   EDUCATION
                   American University of Beirut

                   SKILLS
                   C#, React, SQL
                   """;

        var result = InvokePrivateStatic("ExtractSections", text);
        Assert.NotNull(result);

        var dict = result as System.Collections.IDictionary;
        Assert.NotNull(dict);
        Assert.True(dict!.Contains("summary"));
        Assert.True(dict.Contains("experience"));
        Assert.True(dict.Contains("education"));
        Assert.True(dict.Contains("skills"));
    }

    [Fact]
    public void SplitIntoBulletLines_Should_Split_Multi_Bullet_Text()
    {
        var result = InvokePrivateStatic(
            "SplitIntoBulletLines",
            "• Built API\n• Developed frontend\n• Deployed app");

        Assert.NotNull(result);

        var lines = ((System.Collections.IEnumerable)result!)
            .Cast<object>()
            .Select(x => x?.ToString())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToList();

        Assert.Equal(3, lines.Count);
    }

    [Fact]
    public void NormalizeCvText_Should_Handle_Empty_String()
    {
        var result = (string)InvokePrivateStatic("NormalizeCvText", "")!;

        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void EstimatePages_Should_Never_Return_Less_Than_One()
    {
        var result = (int)InvokePrivateStatic("EstimatePages", "")!;

        Assert.True(result >= 1);
    }
}