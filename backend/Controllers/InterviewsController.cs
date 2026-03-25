using Jobify.Api.Data;
using Jobify.Api.DTOs;
using Jobify.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Jobify.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InterviewsController : ControllerBase
{
    private readonly AppDbContext _db;

    public InterviewsController(AppDbContext db)
    {
        _db = db;
    }

    private string? GetUserId()
        => User.FindFirstValue(ClaimTypes.NameIdentifier);

    [Authorize(Roles = "Recruiter")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateInterviewDto dto)
    {
        var recruiterUserId = GetUserId();
        if (string.IsNullOrWhiteSpace(recruiterUserId))
            return Unauthorized();

        var application = await _db.Applications
            .Include(a => a.Opportunity)
            .FirstOrDefaultAsync(a => a.Id == dto.ApplicationId);

        if (application == null)
            return NotFound("Application not found.");

        if (application.Opportunity == null)
            return BadRequest("Application has no opportunity.");

        if (application.Opportunity.RecruiterUserId != recruiterUserId)
            return Forbid();

        if (application.Status != ApplicationStatus.Shortlisted &&
    application.Status != ApplicationStatus.InterviewScheduled)
        {
            return BadRequest("Only shortlisted or already interviewed applications can be scheduled.");
        }

        var now = DateTime.UtcNow;

        var hasActiveInterview = await _db.Interviews
            .AnyAsync(i =>
                i.ApplicationId == dto.ApplicationId &&
                !i.IsCancelled &&
                i.ScheduledAtUtc.AddHours(1) > now // ⏱️ still ongoing or future
            );

        if (hasActiveInterview)
            return BadRequest("An active interview is already scheduled for this application.");

        var interview = new Interview
        {
            ApplicationId = dto.ApplicationId,
            ScheduledAtUtc = dto.ScheduledAtUtc,
            MeetingLink = dto.MeetingLink,
            Location = dto.Location,
            Notes = dto.Notes
        };

        application.Status = ApplicationStatus.InterviewScheduled;
        application.UpdatedAtUtc = DateTime.UtcNow;

        _db.Interviews.Add(interview);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Interview scheduled successfully." });
    }

    [Authorize(Roles = "Student")]
    [HttpGet("my")]
    public async Task<IActionResult> GetMyInterviews()
    {
        var studentUserId = GetUserId();
        if (string.IsNullOrWhiteSpace(studentUserId))
            return Unauthorized();

        var interviews = await _db.Interviews
            .Include(i => i.Application)
                .ThenInclude(a => a!.Opportunity)
            .Where(i =>
                !i.IsCancelled &&
                i.Application != null &&
                (i.Application.UserId == studentUserId || i.Application.StudentUserId == studentUserId))
            .OrderBy(i => i.ScheduledAtUtc)
            .ToListAsync();

        var result = new List<object>();

        foreach (var i in interviews)
        {
            var app = i.Application;
            if (app == null || app.Opportunity == null) continue;

            var candidateUserId = !string.IsNullOrWhiteSpace(app.UserId)
                ? app.UserId
                : app.StudentUserId;

            var student = string.IsNullOrWhiteSpace(candidateUserId)
                ? null
                : await _db.StudentProfiles
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.UserId == candidateUserId);

            var user = string.IsNullOrWhiteSpace(candidateUserId)
                ? null
                : await _db.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == candidateUserId);

            result.Add(new
            {
                id = i.Id,
                applicationId = i.ApplicationId,
                candidateName =
                    !string.IsNullOrWhiteSpace(student?.FullName) ? student.FullName :
                    !string.IsNullOrWhiteSpace(user?.UserName) ? user.UserName :
                    !string.IsNullOrWhiteSpace(user?.Email) ? user.Email.Split('@')[0] :
                    "Candidate",
                opportunityTitle = app.Opportunity.Title,
                companyName = app.Opportunity.CompanyName,
                scheduledAtUtc = i.ScheduledAtUtc,
                meetingLink = i.MeetingLink,
                location = i.Location,
                notes = i.Notes
            });
        }

        return Ok(result);
    }

    [Authorize(Roles = "Recruiter")]
    [HttpGet("recruiter")]
    public async Task<IActionResult> GetRecruiterInterviews()
    {
        var recruiterUserId = GetUserId();
        if (string.IsNullOrWhiteSpace(recruiterUserId))
            return Unauthorized();

        var interviews = await _db.Interviews
            .Include(i => i.Application)
                .ThenInclude(a => a!.Opportunity)
            .Where(i =>
                !i.IsCancelled &&
                i.Application != null &&
                i.Application.Opportunity != null &&
                i.Application.Opportunity.RecruiterUserId == recruiterUserId
            )
            .OrderBy(i => i.ScheduledAtUtc)
            .ToListAsync();

        var result = new List<object>();

        foreach (var i in interviews)
        {
            var app = i.Application;
            if (app == null || app.Opportunity == null) continue;

            var candidateUserId = !string.IsNullOrWhiteSpace(app.UserId)
                ? app.UserId
                : app.StudentUserId;

            var student = string.IsNullOrWhiteSpace(candidateUserId)
                ? null
                : await _db.StudentProfiles
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.UserId == candidateUserId);

            var user = string.IsNullOrWhiteSpace(candidateUserId)
                ? null
                : await _db.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == candidateUserId);

            result.Add(new
            {
                id = i.Id,
                applicationId = i.ApplicationId,
                candidateName =
                    !string.IsNullOrWhiteSpace(student?.FullName) ? student.FullName :
                    !string.IsNullOrWhiteSpace(user?.UserName) ? user.UserName :
                    !string.IsNullOrWhiteSpace(user?.Email) ? user.Email.Split('@')[0] :
                    "Candidate",
                opportunityTitle = app.Opportunity.Title,
                companyName = app.Opportunity.CompanyName,
                scheduledAtUtc = i.ScheduledAtUtc,
                meetingLink = i.MeetingLink,
                location = i.Location,
                notes = i.Notes
            });
        }

        return Ok(result);
    }
}
