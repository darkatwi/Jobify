using Xunit;
using Jobify.Api.Services.Cv;
using Jobify.Api.Data;
using Jobify.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using Moq;

namespace Jobify.Tests.Services;

public class CvReviewSeededTests
{
    private (CvReviewService service, AppDbContext db) CreateService(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        var db = new AppDbContext(options);

        var envMock = new Mock<IWebHostEnvironment>();
        envMock.Setup(e => e.WebRootPath).Returns("wwwroot");
        envMock.Setup(e => e.ContentRootPath).Returns(".");

        var service = new CvReviewService(db, envMock.Object);
        return (service, db);
    }

    [Fact]
    public async Task Strong_Profile_Should_Score_Higher_Than_Weak_Profile()
    {
        var (service, db) = CreateService("CvSeededTest_1");

        db.StudentProfiles.Add(new StudentProfile
        {
            UserId = "strong-user",
            Email = "strong@example.com",
            FullName = "Strong Student",
            PhoneNumber = "12345678",
            PortfolioUrl = "https://github.com/strongstudent",
            EducationText = "Bachelor of Computer Science at AUB, Expected 2027",
            ExperienceText = "Built APIs and improved performance by 35% during internship",
            ProjectsText = "Jobify platform using ASP.NET Core and React",
            CertificationsText = "AWS Cloud Foundations",
            AwardsText = "Dean's Honor List"
        });

        db.StudentProfiles.Add(new StudentProfile
        {
            UserId = "weak-user",
            Email = "weak@example.com",
            FullName = "Weak Student"
        });

        db.StudentEducations.Add(new StudentEducation
        {
            StudentUserId = "strong-user",
            University = "AUB",
            Degree = "Bachelor",
            Major = "Computer Science",
            GraduationYear = "2027"
        });

        db.StudentExperiences.Add(new StudentExperience
        {
            StudentUserId = "strong-user",
            Role = "Software Engineering Intern",
            Company = "IDS",
            Duration = "Jun 2025 - Aug 2025",
            Description = "Built backend APIs; Improved response time by 35%; Developed recruiter dashboard"
        });

        db.StudentProjects.Add(new StudentProject
        {
            StudentUserId = "strong-user",
            Title = "Jobify",
            TechStack = "ASP.NET Core, React, SQL Server",
            Description = "Built a hiring platform for students and recruiters",
            Links = "https://github.com/strongstudent/jobify"
        });

        db.Skills.AddRange(
            new Skill { Id = 1, Name = "C#" },
            new Skill { Id = 2, Name = "React" },
            new Skill { Id = 3, Name = "SQL" }
        );

        db.StudentSkills.AddRange(
            new StudentSkill { StudentUserId = "strong-user", SkillId = 1 },
            new StudentSkill { StudentUserId = "strong-user", SkillId = 2 },
            new StudentSkill { StudentUserId = "strong-user", SkillId = 3 }
        );

        await db.SaveChangesAsync();

        var strongResult = await service.GenerateReviewAsync("strong-user");
        var weakResult = await service.GenerateReviewAsync("weak-user");

        Assert.NotNull(strongResult);
        Assert.NotNull(weakResult);
        Assert.True(strongResult!.ResumeScore > weakResult!.ResumeScore);
    }

    [Fact]
    public async Task Detected_Skills_Should_Include_Db_Skills()
    {
        var (service, db) = CreateService("CvSeededTest_2");

        db.StudentProfiles.Add(new StudentProfile
        {
            UserId = "skills-user",
            Email = "skills@example.com",
            FullName = "Skills Student"
        });

        db.Skills.AddRange(
            new Skill { Id = 11, Name = "C#" },
            new Skill { Id = 12, Name = "React" }
        );

        db.StudentSkills.AddRange(
            new StudentSkill { StudentUserId = "skills-user", SkillId = 11 },
            new StudentSkill { StudentUserId = "skills-user", SkillId = 12 }
        );

        await db.SaveChangesAsync();

        var result = await service.GenerateReviewAsync("skills-user");

        Assert.NotNull(result);
        Assert.Contains("C#", result!.SkillsCoverage.DetectedSkills);
        Assert.Contains("React", result.SkillsCoverage.DetectedSkills);
    }

    [Fact]
    public async Task Missing_Education_Should_Be_Reflected_In_Section_Checks()
    {
        var (service, db) = CreateService("CvSeededTest_3");

        db.StudentProfiles.Add(new StudentProfile
        {
            UserId = "no-education-user",
            Email = "noedu@example.com",
            FullName = "No Education Student",
            ExperienceText = "Developed internal tools using C# and SQL",
            ProjectsText = "Built a web dashboard for tracking applications"
        });

        await db.SaveChangesAsync();

        var result = await service.GenerateReviewAsync("no-education-user");

        Assert.NotNull(result);
        Assert.False(result!.SectionChecks.HasEducationSection);
    }

    [Fact]
    public async Task Strong_Profile_Should_Have_Strengths()
    {
        var (service, db) = CreateService("CvSeededTest_4");

        db.StudentProfiles.Add(new StudentProfile
        {
            UserId = "strength-user",
            Email = "strength@example.com",
            FullName = "Strong Student",
            EducationText = "Bachelor of Computer Science at AUB, Expected 2027",
            ExperienceText = "Built APIs and improved latency by 40%",
            ProjectsText = "Jobify platform",
            CertificationsText = "AWS Foundations"
        });

        db.StudentEducations.Add(new StudentEducation
        {
            StudentUserId = "strength-user",
            University = "AUB",
            Degree = "Bachelor",
            Major = "Computer Science",
            GraduationYear = "2027"
        });

        db.StudentProjects.Add(new StudentProject
        {
            StudentUserId = "strength-user",
            Title = "Jobify",
            TechStack = "ASP.NET Core, React",
            Description = "Built a full-stack system",
            Links = "https://github.com/example/jobify"
        });

        await db.SaveChangesAsync();

        var result = await service.GenerateReviewAsync("strength-user");

        Assert.NotNull(result);
        Assert.NotEmpty(result!.Strengths);
    }

    [Fact]
    public async Task Weak_Profile_Should_Have_Warnings()
    {
        var (service, db) = CreateService("CvSeededTest_5");

        db.StudentProfiles.Add(new StudentProfile
        {
            UserId = "warning-user",
            Email = "warning@example.com",
            FullName = "Weak Student"
        });

        await db.SaveChangesAsync();

        var result = await service.GenerateReviewAsync("warning-user");

        Assert.NotNull(result);
        Assert.NotEmpty(result!.Warnings);
    }

    [Fact]
    public async Task Github_Project_Should_Be_Reflected_In_Portfolio()
    {
        var (service, db) = CreateService("CvSeededTest_6");

        db.StudentProfiles.Add(new StudentProfile
        {
            UserId = "portfolio-user",
            Email = "portfolio@example.com",
            FullName = "Portfolio Student",
            ProjectsText = "Built portfolio and hiring app"
        });

        db.StudentProjects.Add(new StudentProject
        {
            StudentUserId = "portfolio-user",
            Title = "Jobify",
            TechStack = "ASP.NET Core, React",
            Description = "Built a hiring platform",
            Links = "https://github.com/example/jobify"
        });

        await db.SaveChangesAsync();

        var result = await service.GenerateReviewAsync("portfolio-user");

        Assert.NotNull(result);
        Assert.True(result!.Portfolio.ProjectCount >= 1);
    }
}