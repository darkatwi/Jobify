namespace Jobify.Api.DTOs.Dashboard
{
    public class CandidateDashboardDto
    {
        public string FullName { get; set; } = "";
        public int ProfileCompletionPercentage { get; set; }
        public int SkillsCount { get; set; }
        public int ApplicationsCount { get; set; }
        public int MatchesCount { get; set; }
        public List<DashboardOpportunityDto> RecommendedOpportunities { get; set; } = new();
        public List<DashboardOpportunityDto> RecentOpportunities { get; set; } = new();
    }

    public class DashboardOpportunityDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = "";
        public string CompanyName { get; set; } = "";
        public string Location { get; set; } = "";
        public string WorkMode { get; set; } = "";
        public decimal? MatchScore { get; set; }
    }
}