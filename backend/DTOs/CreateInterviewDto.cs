namespace Jobify.Api.DTOs;

public class CreateInterviewDto
{
    public int ApplicationId { get; set; }
    public DateTime ScheduledAtUtc { get; set; }
    public string? MeetingLink { get; set; }
    public string? Location { get; set; }
    public string? Notes { get; set; }
}
