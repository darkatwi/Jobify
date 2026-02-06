namespace Jobify.Api.DTOs;

public class UpdateOpportunityDto
{
    public string Title { get; set; } = "";
    public string CompanyName { get; set; } = "";
    public string? Location { get; set; }
    public bool IsRemote { get; set; }

    public string Type { get; set; } = "Internship";
    public string Level { get; set; } = "Beginner";

    public decimal? MinPay { get; set; }
    public decimal? MaxPay { get; set; }

    public string? Description { get; set; }
    public DateTime? DeadlineUtc { get; set; }

    public List<string> Skills { get; set; } = new();
}
