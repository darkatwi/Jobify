namespace Jobify.DTOs;

public class UpdateApplicationStatusDto
{
    public string Status { get; set; } = "";
    public string? Note { get; set; }
    public bool SendEmail { get; set; } = true;
    public string? RejectionReason { get; set; }
}
