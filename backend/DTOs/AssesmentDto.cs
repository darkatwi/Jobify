public class AssessmentDto
{
    public int TimeLimitMinutes { get; set; }
    public List<McqDto> Mcqs { get; set; } = new();
    public List<CodingChallengeDto> CodingChallenges { get; set; } = new();
}

public class McqDto
{
    public string Prompt { get; set; } = "";
    public List<string> Options { get; set; } = new();
    public int CorrectIndex { get; set; }
}

public class CodingChallengeDto
{
    public string Title { get; set; } = "";
    public string Prompt { get; set; } = "";
    public string Language { get; set; } = "";
    public string StarterCode { get; set; } = "";
    public string ExpectedOutput { get; set; } = "";
}
