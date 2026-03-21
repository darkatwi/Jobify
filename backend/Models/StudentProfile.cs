using System.ComponentModel.DataAnnotations;

namespace Jobify.Api.Models;

// ─── Main profile ─────────────────────────────────────────────
public class StudentProfile
{
    [Key]
    public string UserId { get; set; }

    public string Email { get; set; } = "";

    public string? FullName { get; set; }
    public string? University { get; set; }
    public string? Major { get; set; }
    public string? Bio { get; set; }
    public string? PortfolioUrl { get; set; }
    public string? Location { get; set; }
    public string? PhoneNumber { get; set; }

    public string? EducationText { get; set; }
    public string? ExperienceText { get; set; }
    public string? ProjectsText { get; set; }
    public string? InterestsText { get; set; }
    public string? CertificationsText { get; set; }
    public string? AwardsText { get; set; }
    public string? ResumeFileName { get; set; }
    public string? ResumeOriginalFileName { get; set; }
    public string? ResumeContentType { get; set; }
    public DateTime? ResumeUploadedAtUtc { get; set; }

    public string? UniversityProofFileName { get; set; }
    public string? UniversityProofOriginalFileName { get; set; }
    public string? UniversityProofContentType { get; set; }
    public DateTime? UniversityProofUploadedAtUtc { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

// ─── Education ────────────────────────────────────────────────
public class StudentEducation
{
    public int Id { get; set; }
    public string StudentUserId { get; set; } = string.Empty;
    public string University { get; set; } = string.Empty;
    public string Degree { get; set; } = string.Empty;
    public string Major { get; set; } = string.Empty;
    public string? Gpa { get; set; }
    public string GraduationYear { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// ─── Experience ───────────────────────────────────────────────
public class StudentExperience
{
    public int Id { get; set; }
    public string StudentUserId { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// ─── Projects ─────────────────────────────────────────────────
public class StudentProject
{
    public int Id { get; set; }
    public string StudentUserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string TechStack { get; set; } = string.Empty;
    public string? Links { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// ─── Interests ────────────────────────────────────────────────
public class StudentInterest
{
    public int Id { get; set; }
    public string StudentUserId { get; set; } = string.Empty;
    public string Interest { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
