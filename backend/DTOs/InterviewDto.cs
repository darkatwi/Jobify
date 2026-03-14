namespace Jobify.Api.DTOs;

public class InterviewDto
{
    public int Id { get; set; }
    public int ApplicationId { get; set; }
    public string CandidateName { get; set; } = "";
    public string OpportunityTitle { get; set; } = "";
    public string CompanyName { get; set; } = "";
    public DateTime ScheduledAtUtc { get; set; }
    public string? MeetingLink { get; set; }
    public string? Location { get; set; }
    public string? Notes { get; set; }
}
