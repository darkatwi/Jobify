using Jobify.Api.Data;
using Jobify.Api.DTOs;
using Jobify.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Jobify.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly RecommendationService _service;

        public RecommendationController(AppDbContext db, RecommendationService service)
        {
            _db = db;
            _service = service;
        }

        // ✅ Optional: keep this for testing (frontend sends skills directly)
        // POST: /api/Recommendation/recommend
        [HttpPost("recommend")]
        public async Task<IActionResult> Recommend([FromBody] RecommendationRequestDto request)
        {
            var opportunities = await _db.Opportunities
                .Include(o => o.OpportunitySkills)
                    .ThenInclude(os => os.Skill)
                .ToListAsync();

            var results = _service.Recommend(request.Skills, opportunities);
            return Ok(results);
        }

        // ✅ Real endpoint: pulls ML-extracted skills (with confidence score) from DB for logged-in user
        // GET: /api/Recommendation/me
        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> RecommendForMe()
        {
            // 1) Get userId from JWT
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("No user id found in token.");

            // 2) Load skills from DB:
            // StudentSkill does NOT have navigation property Skill, so we JOIN Skills table.
            var applicantSkills = await (
                from ss in _db.StudentSkills
                join s in _db.Skills on ss.SkillId equals s.Id
                where ss.StudentUserId == userId
                select new SkillInputDto
                {
                    Name = s.Name,
                    Weight = (double)ss.score // ✅ lowercase 'score' (float)
                }
            ).ToListAsync();

            if (applicantSkills.Count == 0)
                return Ok(new List<RecommendedOpportunityDto>());

            // 3) Load opportunities + their skills
            var opportunities = await _db.Opportunities
                .Include(o => o.OpportunitySkills)
                    .ThenInclude(os => os.Skill)
                .ToListAsync();

            // 4) Recommend
            var results = _service.Recommend(applicantSkills, opportunities);
            return Ok(results);
        }
    }
}