using System.ComponentModel.DataAnnotations;

namespace Jobify.Api.Models;

public class Interview
{
    public int Id { get; set; }

    [Required]
    public int ApplicationId { get; set; }

    public Application? Application { get; set; }

    [Required]
    public DateTime ScheduledAtUtc { get; set; }

    [MaxLength(500)]
    public string? MeetingLink { get; set; }

    [MaxLength(200)]
    public string? Location { get; set; } // e.g. Google Meet / Zoom / Office

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public bool IsCancelled { get; set; } = false;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
