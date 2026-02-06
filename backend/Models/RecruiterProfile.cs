using System.ComponentModel.DataAnnotations;

namespace Jobify.Api.Models;

public enum RecruiterVerificationStatus
{
    EmailPending = 0,   // signed up but email not confirmed
    Pending = 1,        // email confirmed, waiting admin
    Verified = 2,       // admin approved
    Rejected = 3
}

public class RecruiterProfile
{
    [Key]
    public string UserId { get; set; } = string.Empty;

    [Required, MaxLength(120)]
    public string CompanyName { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? EmailDomain { get; set; }

    [MaxLength(300)]
    public string? WebsiteUrl { get; set; }

    [MaxLength(300)]
    public string? LinkedinUrl { get; set; }

    [MaxLength(300)]
    public string? InstagramUrl { get; set; }

    public RecruiterVerificationStatus VerificationStatus { get; set; } =
        RecruiterVerificationStatus.EmailPending;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? EmailConfirmedAtUtc { get; set; }
    public DateTime? VerifiedAtUtc { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}
