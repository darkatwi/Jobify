using System.Security.Claims;
using Jobify.Api.Services.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jobify.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [Authorize]
        [HttpGet("candidate")]
        public async Task<IActionResult> GetCandidateDashboard()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized(new { message = "User ID not found in token." });

            var dashboard = await _dashboardService.GetCandidateDashboardAsync(userId);

            if (dashboard == null)
                return NotFound(new { message = "Candidate profile not found." });

            return Ok(dashboard);
        }
    }
}