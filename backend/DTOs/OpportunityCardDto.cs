namespace Jobify.Api.DTOs;

public class OpportunityCardDto
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string CompanyName { get; set; } = "";
    public string? Location { get; set; }
    public bool IsRemote { get; set; }

    public int MatchPercentage { get; set; }
    public List<string> MatchedSkills { get; set; } = new();

    public string Type { get; set; } = "";   // Internship / Job
    public string Level { get; set; } = "";  // Beginner / Intermediate / Senior

    public decimal? MinPay { get; set; }
    public decimal? MaxPay { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? DeadlineUtc { get; set; }

    public List<string> Skills { get; set; } = new();

    public string WorkMode { get; set; } = "OnSite";

    public int? MatchPercent { get; set; }   // later (best match)

    public int AssessmentTimeLimitSeconds { get; set; }
    public int AssessmentMcqCount { get; set; }
    public int AssessmentChallengeCount { get; set; }
}
