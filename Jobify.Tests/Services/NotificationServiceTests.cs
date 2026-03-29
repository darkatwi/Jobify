using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Jobify.Api.Data;
using Jobify.Api.Models;
using Jobify.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Microsoft.AspNetCore.Identity;

namespace Jobify.Tests;

public class NotificationServiceTests
{
    private static AppDbContext CreateDb(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new AppDbContext(options);
    }

    private static NotificationService CreateService(AppDbContext db)
        => new NotificationService(db);

    [Fact]
    public async Task GetUserNotificationsAsync_Should_Return_Only_NonArchived_For_User_In_Descending_Order()
    {
        using var db = CreateDb(nameof(GetUserNotificationsAsync_Should_Return_Only_NonArchived_For_User_In_Descending_Order));

        db.Notifications.AddRange(
            new Notification
            {
                Id = 1,
                UserId = "user-1",
                Title = "Old Active",
                Message = "A",
                Type = "Info",
                IsRead = false,
                IsArchived = false,
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            },
            new Notification
            {
                Id = 2,
                UserId = "user-1",
                Title = "New Active",
                Message = "B",
                Type = "Info",
                IsRead = true,
                IsArchived = false,
                CreatedAt = DateTime.UtcNow
            },
            new Notification
            {
                Id = 3,
                UserId = "user-1",
                Title = "Archived",
                Message = "C",
                Type = "Info",
                IsRead = false,
                IsArchived = true,
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            },
            new Notification
            {
                Id = 4,
                UserId = "user-2",
                Title = "Other User",
                Message = "D",
                Type = "Info",
                IsRead = false,
                IsArchived = false,
                CreatedAt = DateTime.UtcNow.AddMinutes(-30)
            }
        );

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var result = await service.GetUserNotificationsAsync("user-1");

        Assert.Equal(2, result.Count);
        Assert.Equal("New Active", result[0].Title);
        Assert.Equal("Old Active", result[1].Title);
        Assert.All(result, n => Assert.False(n.Id == 3));
    }

    [Fact]
    public async Task GetArchivedNotificationsAsync_Should_Return_Only_Archived_For_User()
    {
        using var db = CreateDb(nameof(GetArchivedNotificationsAsync_Should_Return_Only_Archived_For_User));

        db.Notifications.AddRange(
            new Notification
            {
                Id = 1,
                UserId = "user-1",
                Title = "Archived 1",
                Message = "A",
                Type = "Info",
                IsRead = false,
                IsArchived = true,
                CreatedAt = DateTime.UtcNow
            },
            new Notification
            {
                Id = 2,
                UserId = "user-1",
                Title = "Active",
                Message = "B",
                Type = "Info",
                IsRead = false,
                IsArchived = false,
                CreatedAt = DateTime.UtcNow
            },
            new Notification
            {
                Id = 3,
                UserId = "user-2",
                Title = "Other User Archived",
                Message = "C",
                Type = "Info",
                IsRead = false,
                IsArchived = true,
                CreatedAt = DateTime.UtcNow
            }
        );

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var result = await service.GetArchivedNotificationsAsync("user-1");

        Assert.Single(result);
        Assert.Equal("Archived 1", result[0].Title);
    }

    [Fact]
    public async Task GetUnreadCountAsync_Should_Count_Only_Unread_And_NonArchived()
    {
        using var db = CreateDb(nameof(GetUnreadCountAsync_Should_Count_Only_Unread_And_NonArchived));

        db.Notifications.AddRange(
            new Notification
            {
                UserId = "user-1",
                Title = "Unread Active 1",
                Message = "A",
                IsRead = false,
                IsArchived = false,
                CreatedAt = DateTime.UtcNow
            },
            new Notification
            {
                UserId = "user-1",
                Title = "Unread Active 2",
                Message = "B",
                IsRead = false,
                IsArchived = false,
                CreatedAt = DateTime.UtcNow
            },
            new Notification
            {
                UserId = "user-1",
                Title = "Read Active",
                Message = "C",
                IsRead = true,
                IsArchived = false,
                CreatedAt = DateTime.UtcNow
            },
            new Notification
            {
                UserId = "user-1",
                Title = "Unread Archived",
                Message = "D",
                IsRead = false,
                IsArchived = true,
                CreatedAt = DateTime.UtcNow
            },
            new Notification
            {
                UserId = "user-2",
                Title = "Other User",
                Message = "E",
                IsRead = false,
                IsArchived = false,
                CreatedAt = DateTime.UtcNow
            }
        );

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var count = await service.GetUnreadCountAsync("user-1");

        Assert.Equal(2, count);
    }

    [Fact]
    public async Task MarkAsReadAsync_Should_Mark_Notification_As_Read_When_Owned_And_Not_Archived()
    {
        using var db = CreateDb(nameof(MarkAsReadAsync_Should_Mark_Notification_As_Read_When_Owned_And_Not_Archived));

        db.Notifications.Add(new Notification
        {
            Id = 1,
            UserId = "user-1",
            Title = "Test",
            Message = "Msg",
            IsRead = false,
            IsArchived = false,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();

        var service = CreateService(db);

        await service.MarkAsReadAsync(1, "user-1");

        var saved = await db.Notifications.FindAsync(1);
        Assert.NotNull(saved);
        Assert.True(saved!.IsRead);
    }

    [Fact]
    public async Task MarkAsReadAsync_Should_Do_Nothing_When_Notification_Does_Not_Belong_To_User()
    {
        using var db = CreateDb(nameof(MarkAsReadAsync_Should_Do_Nothing_When_Notification_Does_Not_Belong_To_User));

        db.Notifications.Add(new Notification
        {
            Id = 1,
            UserId = "user-1",
            Title = "Test",
            Message = "Msg",
            IsRead = false,
            IsArchived = false,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();

        var service = CreateService(db);

        await service.MarkAsReadAsync(1, "user-2");

        var saved = await db.Notifications.FindAsync(1);
        Assert.NotNull(saved);
        Assert.False(saved!.IsRead);
    }

    [Fact]
    public async Task ArchiveAsync_Should_Archive_Notification_When_Owned_By_User()
    {
        using var db = CreateDb(nameof(ArchiveAsync_Should_Archive_Notification_When_Owned_By_User));

        db.Notifications.Add(new Notification
        {
            Id = 1,
            UserId = "user-1",
            Title = "Test",
            Message = "Msg",
            IsRead = false,
            IsArchived = false,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();

        var service = CreateService(db);

        await service.ArchiveAsync(1, "user-1");

        var saved = await db.Notifications.FindAsync(1);
        Assert.NotNull(saved);
        Assert.True(saved!.IsArchived);
    }

    [Fact]
    public async Task UnarchiveAsync_Should_Unarchive_Notification_When_Owned_And_Archived()
    {
        using var db = CreateDb(nameof(UnarchiveAsync_Should_Unarchive_Notification_When_Owned_And_Archived));

        db.Notifications.Add(new Notification
        {
            Id = 1,
            UserId = "user-1",
            Title = "Test",
            Message = "Msg",
            IsRead = false,
            IsArchived = true,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();

        var service = CreateService(db);

        await service.UnarchiveAsync(1, "user-1");

        var saved = await db.Notifications.FindAsync(1);
        Assert.NotNull(saved);
        Assert.False(saved!.IsArchived);
    }

    [Fact]
    public async Task CreateAsync_Should_Add_Notification()
    {
        using var db = CreateDb(nameof(CreateAsync_Should_Add_Notification));

        var service = CreateService(db);

        var notification = new Notification
        {
            UserId = "user-1",
            Title = "Hello",
            Message = "World",
            Type = "Info",
            IsRead = false,
            IsArchived = false,
            CreatedAt = DateTime.UtcNow
        };

        await service.CreateAsync(notification);

        Assert.Single(db.Notifications);
        var saved = await db.Notifications.FirstAsync();
        Assert.Equal("user-1", saved.UserId);
        Assert.Equal("Hello", saved.Title);
        Assert.Equal("World", saved.Message);
    }

    [Fact]
    public async Task CreateNotificationAsync_Should_Add_Default_Unread_Unarchived_Notification()
    {
        using var db = CreateDb(nameof(CreateNotificationAsync_Should_Add_Default_Unread_Unarchived_Notification));

        var service = CreateService(db);

        await service.CreateNotificationAsync("user-1", "Title", "Message");

        var saved = await db.Notifications.SingleAsync();
        Assert.Equal("user-1", saved.UserId);
        Assert.Equal("Title", saved.Title);
        Assert.Equal("Message", saved.Message);
        Assert.False(saved.IsRead);
        Assert.False(saved.IsArchived);
    }

    [Fact]
    public async Task NotifyMatchedStudentsForOpportunityAsync_Should_Create_Notification_For_Matching_Student_Only()
    {
        using var db = CreateDb(nameof(NotifyMatchedStudentsForOpportunityAsync_Should_Create_Notification_For_Matching_Student_Only));

        SeedRolesAndUsers(db);

        db.Skills.AddRange(
            new Skill { Id = 1, Name = "C#" },
            new Skill { Id = 2, Name = "React" },
            new Skill { Id = 3, Name = "Python" }
        );

        db.StudentSkills.AddRange(
            new StudentSkill { StudentUserId = "student-1", SkillId = 1 }, // C#
            new StudentSkill { StudentUserId = "student-1", SkillId = 2 }, // React => 2/2 = 100%
            new StudentSkill { StudentUserId = "student-2", SkillId = 3 }  // Python => 0/2
        );

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var opportunity = new Opportunity
        {
            Id = 10,
            Title = "Software Engineer",
            CompanyName = "Jobify",
            RecruiterUserId = "recruiter-1",
            Type = OpportunityType.Job,
            Level = ExperienceLevel.Entry,
            WorkMode = WorkMode.OnSite,
            CreatedAtUtc = DateTime.UtcNow
        };

        await service.NotifyMatchedStudentsForOpportunityAsync(
            opportunity,
            new List<string> { "C#", "React" },
            threshold: 40.0);

        var notifications = await db.Notifications.ToListAsync();

        Assert.Single(notifications);
        Assert.Equal("student-1", notifications[0].UserId);
        Assert.Equal("OpportunityMatch", notifications[0].Type);
        Assert.Equal(10, notifications[0].OpportunityId);
    }

    [Fact]
    public async Task NotifyMatchedStudentsForOpportunityAsync_Should_Not_Create_Duplicate_Active_Notifications()
    {
        using var db = CreateDb(nameof(NotifyMatchedStudentsForOpportunityAsync_Should_Not_Create_Duplicate_Active_Notifications));

        SeedRolesAndUsers(db);

        db.Skills.Add(new Skill { Id = 1, Name = "C#" });
        db.StudentSkills.Add(new StudentSkill { StudentUserId = "student-1", SkillId = 1 });

        db.Notifications.Add(new Notification
        {
            UserId = "student-1",
            Title = "Existing",
            Message = "Already there",
            Type = "OpportunityMatch",
            OpportunityId = 10,
            IsRead = false,
            IsArchived = false,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();

        var service = CreateService(db);

        var opportunity = new Opportunity
        {
            Id = 10,
            Title = "Software Engineer",
            CompanyName = "Jobify",
            RecruiterUserId = "recruiter-1",
            Type = OpportunityType.Job,
            Level = ExperienceLevel.Entry,
            WorkMode = WorkMode.OnSite,
            CreatedAtUtc = DateTime.UtcNow
        };

        await service.NotifyMatchedStudentsForOpportunityAsync(
            opportunity,
            new List<string> { "C#" },
            threshold: 40.0);

        Assert.Single(db.Notifications);
    }

    [Fact]
    public async Task NotifyMatchedStudentsForOpportunityAsync_Should_Do_Nothing_When_OpportunitySkills_Are_Empty()
    {
        using var db = CreateDb(nameof(NotifyMatchedStudentsForOpportunityAsync_Should_Do_Nothing_When_OpportunitySkills_Are_Empty));

        SeedRolesAndUsers(db);

        var service = CreateService(db);

        var opportunity = new Opportunity
        {
            Id = 10,
            Title = "Software Engineer",
            CompanyName = "Jobify",
            RecruiterUserId = "recruiter-1",
            Type = OpportunityType.Job,
            Level = ExperienceLevel.Entry,
            WorkMode = WorkMode.OnSite,
            CreatedAtUtc = DateTime.UtcNow
        };

        await service.NotifyMatchedStudentsForOpportunityAsync(
            opportunity,
            new List<string>(),
            threshold: 40.0);

        Assert.Empty(db.Notifications);
    }

    private static void SeedRolesAndUsers(AppDbContext db)
    {
        var studentRole = new IdentityRole
        {
            Id = "role-student",
            Name = "Student",
            NormalizedName = "STUDENT"
        };

        var recruiterRole = new IdentityRole
        {
            Id = "role-recruiter",
            Name = "Recruiter",
            NormalizedName = "RECRUITER"
        };

        var student1 = new IdentityUser
        {
            Id = "student-1",
            UserName = "student1@test.com",
            NormalizedUserName = "STUDENT1@TEST.COM",
            Email = "student1@test.com",
            NormalizedEmail = "STUDENT1@TEST.COM"
        };

        var student2 = new IdentityUser
        {
            Id = "student-2",
            UserName = "student2@test.com",
            NormalizedUserName = "STUDENT2@TEST.COM",
            Email = "student2@test.com",
            NormalizedEmail = "STUDENT2@TEST.COM"
        };

        var recruiter = new IdentityUser
        {
            Id = "recruiter-1",
            UserName = "recruiter@test.com",
            NormalizedUserName = "RECRUITER@TEST.COM",
            Email = "recruiter@test.com",
            NormalizedEmail = "RECRUITER@TEST.COM"
        };

        db.Roles.AddRange(studentRole, recruiterRole);
        db.Users.AddRange(student1, student2, recruiter);

        db.UserRoles.AddRange(
            new IdentityUserRole<string> { UserId = "student-1", RoleId = "role-student" },
            new IdentityUserRole<string> { UserId = "student-2", RoleId = "role-student" },
            new IdentityUserRole<string> { UserId = "recruiter-1", RoleId = "role-recruiter" }
        );

        db.SaveChanges();
    }
}