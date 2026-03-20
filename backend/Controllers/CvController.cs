using System.Security.Claims;
using Jobify.Api.DTOs;
using Jobify.Api.Services.Cv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jobify.Api.Controllers
{
    [ApiController]
    [Route("api/cv")]
    public class CvController : ControllerBase
    {
        private readonly ICvReviewService _cvReviewService;

        public CvController(ICvReviewService cvReviewService)
        {
            _cvReviewService = cvReviewService;
        }

        [Authorize]
        [HttpGet("review")]
        public async Task<ActionResult<CvReviewDto>> GetReview()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized();

            var result = await _cvReviewService.GenerateReviewAsync(userId);

            if (result == null)
                return NotFound(new { message = "No CV review data found." });

            return Ok(result);
        }
    }
}
