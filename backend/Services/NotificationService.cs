using Jobify.Api.Data;
using Jobify.Api.Models;
using Jobify.Api.Dtos.Notifications;
using Microsoft.EntityFrameworkCore;

namespace Jobify.Api.Services;

public class NotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

    // =========================
    // GET USER NOTIFICATIONS
    // =========================
    public async Task<List<NotificationDto>> GetUserNotificationsAsync(string userId)
    {
        return await _db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Title = n.Title,
                Message = n.Message,
                Type = n.Type,
                OpportunityId = n.OpportunityId,
                IsRead = n.IsRead,
                CreatedAtUtc = n.CreatedAtUtc
            })
            .ToListAsync();
    }

    // =========================
    // UNREAD COUNT
    // =========================
    public async Task<int> GetUnreadCountAsync(string userId)
    {
        return await _db.Notifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);
    }

    // =========================
    // MARK AS READ
    // =========================
    public async Task MarkAsReadAsync(int notificationId, string userId)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

        if (notification == null) return;

        notification.IsRead = true;
        await _db.SaveChangesAsync();
    }

    // =========================
    // CREATE SINGLE NOTIFICATION
    // =========================
    public async Task CreateAsync(Notification notification)
    {
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();
    }

    // =========================
    // 🔥 CREATE NOTIFICATIONS FOR MATCHED STUDENTS
    // =========================
    public async Task NotifyMatchedStudentsForOpportunityAsync(
        Opportunity opportunity,
        List<string> opportunitySkills,
        double threshold = 40.0)
    {
        // Get all students (users with Student role)
        var students = await _db.Users
            .Join(_db.UserRoles,
                  u => u.Id,
                  ur => ur.UserId,
                  (u, ur) => new { u, ur })
            .Join(_db.Roles,
                  x => x.ur.RoleId,
                  r => r.Id,
                  (x, r) => new { x.u, RoleName = r.Name })
            .Where(x => x.RoleName == "Student")
            .Select(x => x.u)
            .ToListAsync();

        foreach (var student in students)
        {
            // Get student's skills
            var studentSkills = await _db.StudentSkills
                .Where(ss => ss.StudentUserId == student.Id)
                .Join(_db.Skills,
                      ss => ss.SkillId,
                      s => s.Id,
                      (ss, s) => s.Name)
                .ToListAsync();

            if (studentSkills.Count == 0)
                continue;

            var normalizedStudentSkills = studentSkills
                .Select(s => s.Trim().ToLower())
                .Distinct()
                .ToList();

            var normalizedOpportunitySkills = opportunitySkills
                .Select(s => s.Trim().ToLower())
                .Distinct()
                .ToList();

            if (normalizedOpportunitySkills.Count == 0)
                continue;

            // Calculate match
            var matchedCount = normalizedOpportunitySkills
                .Count(skill => normalizedStudentSkills.Contains(skill));

            var matchPercentage =
                (double)matchedCount / normalizedOpportunitySkills.Count * 100.0;

            // Apply threshold
            if (matchPercentage >= threshold)
            {
                // Prevent duplicates
                var alreadyExists = await _db.Notifications.AnyAsync(n =>
                    n.UserId == student.Id &&
                    n.OpportunityId == opportunity.Id &&
                    n.Type == "OpportunityMatch");

                if (alreadyExists)
                    continue;

                _db.Notifications.Add(new Notification
                {
                    UserId = student.Id,
                    Title = "New matching opportunity",
                    Message = $"{opportunity.Title} at {opportunity.CompanyName} matches your profile.",
                    Type = "OpportunityMatch",
                    OpportunityId = opportunity.Id,
                    IsRead = false,
                    CreatedAtUtc = DateTime.UtcNow
                });
            }
        }

        await _db.SaveChangesAsync();
    }
}