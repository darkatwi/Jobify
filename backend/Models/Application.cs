using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Jobify.Api.Models;

public enum ApplicationStatus
{
    Draft = 0,
    Pending = 1,
    InReview = 2,
    AssessmentSent = 3,
    InAssessment = 4,
    AssessmentSubmitted = 5,
    Submitted = 6,
    Accepted = 7,
    Rejected = 8,
    Withdrawn = 9
}

public class Application
{
    public int Id { get; set; }

    [Required]
    public int OpportunityId { get; set; }

    public Opportunity? Opportunity { get; set; }

    [Required]
    public string StudentUserId { get; set; } = string.Empty;

    [Required]
    public string UserId { get; set; } = string.Empty;

    [NotMapped]
    public string EffectiveUserId => !string.IsNullOrWhiteSpace(UserId) ? UserId : StudentUserId;

    public ApplicationStatus Status { get; set; } = ApplicationStatus.Draft;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? WithdrawndAt { get; set; };

    public string? Note { get; set; }

    public ApplicationAssessment? Assessment { get; set; }

    public string? AssessmentJson { get; set; }
}
