namespace Jobify.Api.Models;

public class OpportunitySkill
{
    public int Id { get; set; }

    public int OpportunityId { get; set; }
    public Opportunity? Opportunity { get; set; }   // ✅ nav

    public int SkillId { get; set; }
    public Skill? Skill { get; set; }               // ✅ nav
}
