using System.ComponentModel.DataAnnotations;

namespace Jobify.Api.Models;

public enum OpportunityType { Internship = 0, Job = 1, Scholarship = 2, Workshop = 3 }
public enum ExperienceLevel { Intern = 0, Entry = 1, Junior = 2, Senior = 3 }

public class Opportunity
{
    public int Id { get; set; }

    [Required, MaxLength(120)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(120)]
    public string CompanyName { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? Location { get; set; }

    public bool IsRemote { get; set; }

    public OpportunityType Type { get; set; }
    public ExperienceLevel Level { get; set; }

    public decimal? MinPay { get; set; }
    public decimal? MaxPay { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? DeadlineUtc { get; set; }

    public ICollection<OpportunitySkill> OpportunitySkills { get; set; } = new List<OpportunitySkill>();
}
