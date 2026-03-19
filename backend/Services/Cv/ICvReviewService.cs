using Jobify.Api.DTOs;

namespace Jobify.Api.Services.Cv
{
    public interface ICvReviewService
    {
        Task<CvReviewDto?> GenerateReviewAsync(string userId);
    }
}
