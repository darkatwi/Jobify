namespace Jobify.Api.DTOs;

public class OpportunityCardDto
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string CompanyName { get; set; } = "";
    public string? Location { get; set; }
    public bool IsRemote { get; set; }

    public string Type { get; set; } = "";
    public string Level { get; set; } = "";

    public decimal? MinPay { get; set; }
    public decimal? MaxPay { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? DeadlineUtc { get; set; }

    public List<string> Skills { get; set; } = new();

    public string WorkMode { get; set; } = "";
    public int AssessmentTimeLimitSeconds { get; set; }
    public int AssessmentMcqCount { get; set; }
    public int AssessmentChallengeCount { get; set; }

    public double? MatchPercentage { get; set; }
    public List<string> MatchedSkills { get; set; } = new();
    
    public int ApplicantCount { get; set; }

    
}
