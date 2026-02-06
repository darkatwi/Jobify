namespace Jobify.Api.Models;

//list of all skills in the system - later used for recommendation system
public class Skill
{
    public int Id { get; set; } //id of the skill (pk)
    public string Name { get; set; } = ""; //name of the skill
}
