public class CvReviewDto
{
    public int ResumeScore { get; set; }
    public List<string> Strengths { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public List<string> Suggestions { get; set; } = new();

    public CvSectionChecksDto SectionChecks { get; set; } = new();
    public CvContentQualityDto ContentQuality { get; set; } = new();
    public CvSkillsCoverageDto SkillsCoverage { get; set; } = new();
    public CvPortfolioDto Portfolio { get; set; } = new();
}

public class CvSectionChecksDto
{
    public bool HasSkillsSection { get; set; }
    public bool HasEducationSection { get; set; }
    public bool HasExperienceSection { get; set; }
    public bool HasProjectsSection { get; set; }
}

public class CvContentQualityDto
{
    public bool UsesActionVerbs { get; set; }
    public bool HasMeasurableAchievements { get; set; }
    public int BulletCount { get; set; }
}

public class CvSkillsCoverageDto
{
    public List<string> DetectedSkills { get; set; } = new();
    public List<string> MissingSuggestedSkills { get; set; } = new();
}

public class CvPortfolioDto
{
    public int ProjectCount { get; set; }
    public bool HasGithubLinks { get; set; }
}
