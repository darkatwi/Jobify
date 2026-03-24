namespace Jobify.Api.Models;

public class Notification
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;   // student user id

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    public string Type { get; set; } = "OpportunityMatch"; // optional for future use

    public int? OpportunityId { get; set; }   // link to the opportunity if needed

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}