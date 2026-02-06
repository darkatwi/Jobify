namespace Jobify.Api.DTOs;

public class OpportunityCardDto
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string CompanyName { get; set; } = "";
    public string? Location { get; set; }
    public bool IsRemote { get; set; }

    public string Type { get; set; } = "";   // Internship / Job
    public string Level { get; set; } = "";  // Beginner / Intermediate / Senior

    public decimal? MinPay { get; set; }
    public decimal? MaxPay { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? DeadlineUtc { get; set; }

    public List<string> Skills { get; set; } = new();

    public int? MatchPercent { get; set; }   // later (best match)
}
