namespace Jobify.Api.Models;

public class StudentSkill
{
    public int Id { get; set; }
    public string StudentUserId { get; set; } = string.Empty;
    public int SkillId { get; set; }

    public float score { get; set; } = 1.0f;   // ML confidence

    public string Source { get; set; } = "Manual";
    public bool IsVerified { get; set; } = false;
    public string? VerifiedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}