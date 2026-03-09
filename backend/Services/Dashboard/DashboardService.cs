using Jobify.Api.Data;
using Jobify.Api.DTOs.Dashboard;
using Microsoft.EntityFrameworkCore;

namespace Jobify.Api.Services.Dashboard
{
    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _context;

        public DashboardService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<CandidateDashboardDto?> GetCandidateDashboardAsync(string userId)
        {
            var profile = await _context.StudentProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
                return null;

            var studentSkillRows = await _context.StudentSkills
                .Where(s => s.StudentUserId == userId)
                .ToListAsync();

            var skillIds = studentSkillRows
                .Select(s => s.SkillId)
                .Distinct()
                .ToList();

            var skillsCount = skillIds.Count;

            var applicationsCount = await _context.Applications
                .CountAsync(a => a.StudentUserId == userId);

            var recentOpportunitiesRaw = await _context.Opportunities
                .Where(o => !o.IsClosed)
                .OrderByDescending(o => o.CreatedAtUtc)
                .Take(5)
                .ToListAsync();

            var allOpenOpportunities = await _context.Opportunities
                .Where(o => !o.IsClosed)
                .Include(o => o.OpportunitySkills)
                .OrderByDescending(o => o.CreatedAtUtc)
                .Take(30)
                .ToListAsync();

            var recommended = new List<DashboardOpportunityDto>();

            foreach (var opportunity in allOpenOpportunities)
            {
                var requiredSkillIds = opportunity.OpportunitySkills
                    .Select(os => os.SkillId)
                    .Distinct()
                    .ToList();

                decimal? matchScore = null;

                if (requiredSkillIds.Count > 0)
                {
                    var matchedCount = requiredSkillIds.Count(skillId => skillIds.Contains(skillId));
                    matchScore = Math.Round((decimal)matchedCount * 100 / requiredSkillIds.Count, 0);
                }

                if (matchScore.HasValue && matchScore.Value > 0)
                {
                    recommended.Add(new DashboardOpportunityDto
                    {
                        Id = opportunity.Id,
                        Title = opportunity.Title,
                        CompanyName = opportunity.CompanyName,
                        Location = GetOpportunityLocation(opportunity),
                        WorkMode = opportunity.WorkMode.ToString(),
                        MatchScore = matchScore
                    });
                }
            }

            var topRecommended = recommended
                .OrderByDescending(r => r.MatchScore)
                .Take(5)
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