using Jobify.Api.Data;
using Jobify.Api.DTOs;
using Jobify.Api.DTOs.Dashboard;
using Jobify.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jobify.Api.Services.Dashboard
{
    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _context;
        private readonly RecommendationService _recommendationService;

        public DashboardService(AppDbContext context, RecommendationService recommendationService)
        {
            _context = context;
            _recommendationService = recommendationService;
        }

        public async Task<CandidateDashboardDto?> GetCandidateDashboardAsync(string userId)
        {
            var profile = await _context.StudentProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
                return null;

            var applicantSkills = await _context.StudentSkills
                .Where(ss => ss.StudentUserId == userId)
                .Join(
                    _context.Skills,
                    ss => ss.SkillId,
                    s => s.Id,
                    (ss, s) => new SkillInputDto
                    {
                        Name = s.Name,
                        Weight = 1
                    }
                )
                .ToListAsync();

            var skillsCount = applicantSkills
                .Where(s => !string.IsNullOrWhiteSpace(s.Name))
                .Select(s => s.Name.Trim().ToLower())
                .Distinct()
                .Count();

            var applicationsCount = await _context.Applications
                .CountAsync(a => a.UserId == userId);

            var recentOpportunitiesRaw = await _context.Opportunities
                .Where(o => !o.IsClosed)
                .OrderByDescending(o => o.CreatedAtUtc)
                .Take(5)
                .ToListAsync();

            var allOpenOpportunities = await _context.Opportunities
                .Where(o => !o.IsClosed)
                .Include(o => o.OpportunitySkills)
                    .ThenInclude(os => os.Skill)
                .OrderByDescending(o => o.CreatedAtUtc)
                .Take(30)
                .ToListAsync();

            var recommendationResults = _recommendationService.Recommend(applicantSkills, allOpenOpportunities);

            var topRecommended = recommendationResults
                .Take(5)
                .Select(r => new DashboardOpportunityDto
                {
                    Id = r.OpportunityId,
                    Title = r.Title,
                    CompanyName = allOpenOpportunities.FirstOrDefault(o => o.Id == r.OpportunityId)?.CompanyName ?? "",
                    Location = GetOpportunityLocation(allOpenOpportunities.First(o => o.Id == r.OpportunityId)),
                    WorkMode = allOpenOpportunities.First(o => o.Id == r.OpportunityId).WorkMode.ToString(),
                    MatchScore = Math.Round((decimal)(r.Score * 100), 0)
                })
                .ToList();

            var recentOpportunities = recentOpportunitiesRaw
                .Select(o => new DashboardOpportunityDto
                {
                    Id = o.Id,
                    Title = o.Title,
                    CompanyName = o.CompanyName,
                    Location = GetOpportunityLocation(o),
                    WorkMode = o.WorkMode.ToString(),
                    MatchScore = null
                })
                .ToList();

            var profileCompletion = CalculateProfileCompletion(profile, skillsCount);

            return new CandidateDashboardDto
            {
                FullName = string.IsNullOrWhiteSpace(profile.FullName) ? "Candidate" : profile.FullName,
                ProfileCompletionPercentage = profileCompletion,
                SkillsCount = skillsCount,
                ApplicationsCount = applicationsCount,
                MatchesCount = topRecommended.Count,
                RecommendedOpportunities = topRecommended,
                RecentOpportunities = recentOpportunities
            };
        }

        private static int CalculateProfileCompletion(Models.StudentProfile profile, int skillsCount)
        {
            int score = 0;

            if (!string.IsNullOrWhiteSpace(profile.FullName)) score += 10;
            if (!string.IsNullOrWhiteSpace(profile.University)) score += 10;
            if (!string.IsNullOrWhiteSpace(profile.Major)) score += 10;
            if (!string.IsNullOrWhiteSpace(profile.Bio)) score += 10;
            if (!string.IsNullOrWhiteSpace(profile.Location)) score += 10;
            if (!string.IsNullOrWhiteSpace(profile.PhoneNumber)) score += 10;
            if (!string.IsNullOrWhiteSpace(profile.PortfolioUrl)) score += 10;
            if (!string.IsNullOrWhiteSpace(profile.ResumeFileName)) score += 15;
            if (!string.IsNullOrWhiteSpace(profile.UniversityProofFileName)) score += 15;
            if (skillsCount > 0) score += 10;

            if (score > 100) score = 100;

            return score;
        }

        private static string GetOpportunityLocation(Models.Opportunity opportunity)
        {
            if (!string.IsNullOrWhiteSpace(opportunity.LocationName))
                return opportunity.LocationName;

            if (!string.IsNullOrWhiteSpace(opportunity.Location))
                return opportunity.Location;

            if (opportunity.IsRemote)
                return "Remote";

            return "Not specified";
        }
    }
}
