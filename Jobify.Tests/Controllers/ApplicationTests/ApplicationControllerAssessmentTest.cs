using System.Net.Http;
using System.Security.Claims;
using Jobify.Api.Controllers;
using Jobify.Api.Data;
using Jobify.Api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Xunit;

namespace Jobify.Tests.Controllers.ApplicationTests;

public class ApplicationControllerAssessmentTests
{
    private static AppDbContext CreateDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new AppDbContext(options);
    }

    private static ApplicationController CreateController(
        AppDbContext db,
        string? userId = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Judge0:BaseUrl"] = "https://judge0.test"
            })
            .Build();

        var controller = new ApplicationController(
            db,
            new FakeHttpClientFactory(),
            config,
            new FakeWebHostEnvironment());

        if (!string.IsNullOrWhiteSpace(userId))
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, userId)
            };

            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = principal
                }
            };
        }

        return controller;
    }

    private static Opportunity CreateOpportunityWithAssessment(int id = 1)
    {
        return new Opportunity
        {
            Id = id,
            Title = "Software Engineer Intern",
            CompanyName = "Jobify",
            RecruiterUserId = "recruiter-1",
            AssessmentJson = """
            {
              "questions": [
                { "id": "q1", "type": "mcq", "correctIndex": 1 },
                { "id": "q2", "type": "mcq", "correctIndex": 0 }
              ]
            }
            """
        };
    }

    private static Application CreateStudentApplication(
        Opportunity opportunity,
        int applicationId = 1,
        string studentId = "student-1",
        ApplicationStatus status = ApplicationStatus.Draft)
    {
        return new Application
        {
            Id = applicationId,
            OpportunityId = opportunity.Id,
            Opportunity = opportunity,
            UserId = studentId,
            StudentUserId = studentId,
            Status = status,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };
    }

    [Fact]
    public async Task StartAssessment_AppNotFound_ReturnsNotFound()
    {
        using var db = CreateDbContext(nameof(StartAssessment_AppNotFound_ReturnsNotFound));
        var controller = CreateController(db, "student-1");

        var result = await controller.StartAssessment(
            999,
            new ApplicationController.StartAssessmentDto { WebcamConsent = true });

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task StartAssessment_WithdrawnApplication_ReturnsBadRequest()
    {
        using var db = CreateDbContext(nameof(StartAssessment_WithdrawnApplication_ReturnsBadRequest));

        var opportunity = CreateOpportunityWithAssessment();
        var app = CreateStudentApplication(opportunity, status: ApplicationStatus.Withdrawn);

        db.Opportunities.Add(opportunity);
        db.Applications.Add(app);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.StartAssessment(
            app.Id,
            new ApplicationController.StartAssessmentDto { WebcamConsent = true });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Application is withdrawn.", badRequest.Value);
    }

    [Fact]
    public async Task StartAssessment_NoAssessment_ReturnsBadRequest()
    {
        using var db = CreateDbContext(nameof(StartAssessment_NoAssessment_ReturnsBadRequest));

        var opportunity = new Opportunity
        {
            Id = 1,
            Title = "Software Engineer Intern",
            CompanyName = "Jobify",
            RecruiterUserId = "recruiter-1",
            AssessmentJson = null
        };

        var app = CreateStudentApplication(opportunity);

        db.Opportunities.Add(opportunity);
        db.Applications.Add(app);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.StartAssessment(
            app.Id,
            new ApplicationController.StartAssessmentDto { WebcamConsent = true });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("This opportunity has no assessment.", badRequest.Value);
    }

    [Fact]
    public async Task StartAssessment_ValidRequest_CreatesAttempt_AndSetsStatus()
    {
        using var db = CreateDbContext(nameof(StartAssessment_ValidRequest_CreatesAttempt_AndSetsStatus));

        var opportunity = CreateOpportunityWithAssessment();
        var app = CreateStudentApplication(opportunity);

        db.Opportunities.Add(opportunity);
        db.Applications.Add(app);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.StartAssessment(
            app.Id,
            new ApplicationController.StartAssessmentDto { WebcamConsent = true });

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        var savedAttempt = await db.ApplicationAssessments.FirstOrDefaultAsync(x => x.ApplicationId == app.Id);
        Assert.NotNull(savedAttempt);
        Assert.Equal("{}", savedAttempt!.AnswersJson);
        Assert.True(savedAttempt.WebcamConsent);

        var savedApp = await db.Applications.FindAsync(app.Id);
        Assert.NotNull(savedApp);
        Assert.Equal(ApplicationStatus.InAssessment, savedApp!.Status);
    }

    [Fact]
    public async Task SaveAssessment_NotStarted_ReturnsNotFound()
    {
        using var db = CreateDbContext(nameof(SaveAssessment_NotStarted_ReturnsNotFound));
        var controller = CreateController(db, "student-1");

        var result = await controller.SaveAssessment(
            999,
            new ApplicationController.SaveAssessmentDto
            {
                Answers = new { q1 = 1 }
            });

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal("Assessment not started.", notFound.Value);
    }

    [Fact]
    public async Task SaveAssessment_AlreadySubmitted_ReturnsBadRequest()
    {
        using var db = CreateDbContext(nameof(SaveAssessment_AlreadySubmitted_ReturnsBadRequest));

        var opportunity = CreateOpportunityWithAssessment();
        var app = CreateStudentApplication(opportunity, status: ApplicationStatus.InAssessment);

        var attempt = new ApplicationAssessment
        {
            ApplicationId = app.Id,
            Application = app,
            StartedAtUtc = DateTime.UtcNow.AddMinutes(-10),
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(20),
            SubmittedAtUtc = DateTime.UtcNow.AddMinutes(-1),
            AnswersJson = "{}"
        };

        db.Opportunities.Add(opportunity);
        db.Applications.Add(app);
        db.ApplicationAssessments.Add(attempt);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.SaveAssessment(
            app.Id,
            new ApplicationController.SaveAssessmentDto
            {
                Answers = new { q1 = 1 }
            });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Already submitted.", badRequest.Value);
    }

    [Fact]
    public async Task SaveAssessment_Expired_ReturnsBadRequest()
    {
        using var db = CreateDbContext(nameof(SaveAssessment_Expired_ReturnsBadRequest));

        var opportunity = CreateOpportunityWithAssessment();
        var app = CreateStudentApplication(opportunity, status: ApplicationStatus.InAssessment);

        var attempt = new ApplicationAssessment
        {
            ApplicationId = app.Id,
            Application = app,
            StartedAtUtc = DateTime.UtcNow.AddMinutes(-20),
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1),
            AnswersJson = "{}"
        };

        db.Opportunities.Add(opportunity);
        db.Applications.Add(app);
        db.ApplicationAssessments.Add(attempt);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.SaveAssessment(
            app.Id,
            new ApplicationController.SaveAssessmentDto
            {
                Answers = new { q1 = 1 }
            });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Time is up.", badRequest.Value);
    }

    [Fact]
    public async Task SaveAssessment_ValidRequest_SavesAnswers_AndReturnsNoContent()
    {
        using var db = CreateDbContext(nameof(SaveAssessment_ValidRequest_SavesAnswers_AndReturnsNoContent));

        var opportunity = CreateOpportunityWithAssessment();
        var app = CreateStudentApplication(opportunity, status: ApplicationStatus.InAssessment);

        var attempt = new ApplicationAssessment
        {
            ApplicationId = app.Id,
            Application = app,
            StartedAtUtc = DateTime.UtcNow.AddMinutes(-10),
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(20),
            AnswersJson = "{}"
        };

        db.Opportunities.Add(opportunity);
        db.Applications.Add(app);
        db.ApplicationAssessments.Add(attempt);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.SaveAssessment(
            app.Id,
            new ApplicationController.SaveAssessmentDto
            {
                Answers = new { q1 = 1, q2 = 0 }
            });

        Assert.IsType<NoContentResult>(result);

        var savedAttempt = await db.ApplicationAssessments.FirstAsync(x => x.ApplicationId == app.Id);
        Assert.Contains("\"q1\":1", savedAttempt.AnswersJson);
        Assert.Contains("\"q2\":0", savedAttempt.AnswersJson);
    }

    [Fact]
    public async Task Submit_NotStarted_ReturnsNotFound()
    {
        using var db = CreateDbContext(nameof(Submit_NotStarted_ReturnsNotFound));
        var controller = CreateController(db, "student-1");

        var result = await controller.Submit(999);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal("Assessment not started.", notFound.Value);
    }

    [Fact]
    public async Task Submit_AlreadySubmitted_ReturnsBadRequest()
    {
        using var db = CreateDbContext(nameof(Submit_AlreadySubmitted_ReturnsBadRequest));

        var opportunity = CreateOpportunityWithAssessment();
        var app = CreateStudentApplication(opportunity, status: ApplicationStatus.InAssessment);

        var attempt = new ApplicationAssessment
        {
            ApplicationId = app.Id,
            Application = app,
            StartedAtUtc = DateTime.UtcNow.AddMinutes(-10),
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(20),
            SubmittedAtUtc = DateTime.UtcNow,
            AnswersJson = "{}"
        };

        db.Opportunities.Add(opportunity);
        db.Applications.Add(app);
        db.ApplicationAssessments.Add(attempt);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.Submit(app.Id);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Already submitted.", badRequest.Value);
    }

    [Fact]
    public async Task Submit_Expired_ReturnsBadRequest()
    {
        using var db = CreateDbContext(nameof(Submit_Expired_ReturnsBadRequest));

        var opportunity = CreateOpportunityWithAssessment();
        var app = CreateStudentApplication(opportunity, status: ApplicationStatus.InAssessment);

        var attempt = new ApplicationAssessment
        {
            ApplicationId = app.Id,
            Application = app,
            StartedAtUtc = DateTime.UtcNow.AddMinutes(-20),
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1),
            AnswersJson = "{}"
        };

        db.Opportunities.Add(opportunity);
        db.Applications.Add(app);
        db.ApplicationAssessments.Add(attempt);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.Submit(app.Id);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Time is up.", badRequest.Value);
    }

    [Fact]
    public async Task Submit_NoAssessment_ReturnsBadRequest()
    {
        using var db = CreateDbContext(nameof(Submit_NoAssessment_ReturnsBadRequest));

        var opportunity = new Opportunity
        {
            Id = 1,
            Title = "Software Engineer Intern",
            CompanyName = "Jobify",
            RecruiterUserId = "recruiter-1",
            AssessmentJson = null
        };

        var app = CreateStudentApplication(opportunity, status: ApplicationStatus.InAssessment);

        var attempt = new ApplicationAssessment
        {
            ApplicationId = app.Id,
            Application = app,
            StartedAtUtc = DateTime.UtcNow.AddMinutes(-5),
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(20),
            AnswersJson = "{}"
        };

        db.Opportunities.Add(opportunity);
        db.Applications.Add(app);
        db.ApplicationAssessments.Add(attempt);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.Submit(app.Id);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("No assessment.", badRequest.Value);
    }

    [Fact]
    public async Task Submit_McqOnly_ComputesScore_AndMarksSubmitted()
    {
        using var db = CreateDbContext(nameof(Submit_McqOnly_ComputesScore_AndMarksSubmitted));

        var opportunity = CreateOpportunityWithAssessment();
        var app = CreateStudentApplication(opportunity, status: ApplicationStatus.InAssessment);

        var attempt = new ApplicationAssessment
        {
            ApplicationId = app.Id,
            Application = app,
            StartedAtUtc = DateTime.UtcNow.AddMinutes(-5),
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(20),
            AnswersJson = """
            {
              "q1": 1,
              "q2": 0
            }
            """
        };

        db.Opportunities.Add(opportunity);
        db.Applications.Add(app);
        db.ApplicationAssessments.Add(attempt);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.Submit(app.Id);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        var savedAttempt = await db.ApplicationAssessments.FirstAsync(x => x.ApplicationId == app.Id);
        Assert.Equal(100m, savedAttempt.Score);
        Assert.NotNull(savedAttempt.SubmittedAtUtc);

        var savedApp = await db.Applications.FindAsync(app.Id);
        Assert.NotNull(savedApp);
        Assert.Equal(ApplicationStatus.Submitted, savedApp!.Status);
    }

    [Fact]
    public async Task ResetAssessment_AppNotFound_ReturnsNotFound()
    {
        using var db = CreateDbContext(nameof(ResetAssessment_AppNotFound_ReturnsNotFound));
        var controller = CreateController(db, "student-1");

        var result = await controller.ResetAssessment(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ResetAssessment_RemovesAttempt_AndSetsDraft()
    {
        using var db = CreateDbContext(nameof(ResetAssessment_RemovesAttempt_AndSetsDraft));

        var opportunity = CreateOpportunityWithAssessment();
        var app = CreateStudentApplication(opportunity, status: ApplicationStatus.InAssessment);

        var attempt = new ApplicationAssessment
        {
            ApplicationId = app.Id,
            Application = app,
            StartedAtUtc = DateTime.UtcNow.AddMinutes(-5),
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(20),
            AnswersJson = "{}"
        };

        db.Opportunities.Add(opportunity);
        db.Applications.Add(app);
        db.ApplicationAssessments.Add(attempt);
        await db.SaveChangesAsync();

        var controller = CreateController(db, "student-1");

        var result = await controller.ResetAssessment(app.Id);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        var savedApp = await db.Applications.FindAsync(app.Id);
        Assert.NotNull(savedApp);
        Assert.Equal(ApplicationStatus.Draft, savedApp!.Status);

        var savedAttempt = await db.ApplicationAssessments.FirstOrDefaultAsync(x => x.ApplicationId == app.Id);
        Assert.Null(savedAttempt);
    }

    private sealed class FakeHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }

    private sealed class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Jobify.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string WebRootPath { get; set; } = "wwwroot";
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; } = ".";
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}