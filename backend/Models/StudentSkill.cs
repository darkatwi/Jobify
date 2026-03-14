namespace Jobify.Api.Models;

public class StudentSkill
{
    public int Id { get; set; }
    public string StudentUserId { get; set; } = string.Empty;
    public int SkillId { get; set; }

    public int score { get; set; } = 1;

    public string Source { get; set; } = "Manual";
    public bool IsVerified { get; set; } = false;
    public string? VerifiedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
