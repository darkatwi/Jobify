namespace Jobify.Api.DTOs
{
    public class MlSkillDto
    {
        public string skill { get; set; } = "";
        public float score { get; set; }
    }

    public class MlExtractResponseDto
    {
        public List<MlSkillDto> skills { get; set; } = new();
    }
}