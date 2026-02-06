namespace Jobify.Api.Models;
//used to link students to their skills
public class StudentSkill
{
    public int Id { get; set; } //pk
    public string StudentUserId { get; set; } = string.Empty; //whcih student own this skill (fk) studentProfiles.UserId
    public int SkillId { get; set; } // fk to skills.id

    public string Source { get; set; } = "Manual"; // Manual | Extracted from the cv or not
    public bool IsVerified { get; set; } = false; //true if verifiied
    public string? VerifiedBy { get; set; } //how was it verified???
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; //when was the skill added
}
