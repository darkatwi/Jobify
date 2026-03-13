using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Jobify.Api.Models;

public enum OpportunityType { Internship = 0, Job = 1, Scholarship = 2, Workshop = 3 }
public enum ExperienceLevel { Intern = 0, Entry = 1, Junior = 2, Senior = 3 }

public enum WorkMode { OnSite = 0, Remote = 1, Hybrid = 2 }

public class Opportunity
{
    public int Id { get; set; }

    [Required, MaxLength(120)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(120)]
    public string CompanyName { get; set; } = string.Empty;

    [Required]
    public string RecruiterUserId { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? Location { get; set; }   

    public bool IsRemote { get; set; }      

    public WorkMode WorkMode { get; set; } = WorkMode.OnSite;

    [MaxLength(150)]
    public string? LocationName { get; set; }   

    [MaxLength(250)]
    public string? FullAddress { get; set; }   

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public OpportunityType Type { get; set; }
    public ExperienceLevel Level { get; set; }

    public decimal? MinPay { get; set; }
    public decimal? MaxPay { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }

    public string? ResponsibilitiesJson { get; set; }  
    public string? PreferredSkillsJson { get; set; }   
    public string? BenefitsJson { get; set; }           
    public string? AssessmentJson { get; set; }         

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? DeadlineUtc { get; set; }

    public int AssessmentTimeLimitSeconds { get; set; } = 45 * 60;
    public int AssessmentMcqCount { get; set; } = 5;
    public int AssessmentChallengeCount { get; set; } = 2;

    public bool IsClosed { get; set; } = false;
    public DateTime? ClosedAtUtc { get; set; }

    public ICollection<OpportunitySkill> OpportunitySkills { get; set; } = new List<OpportunitySkill>();
}
