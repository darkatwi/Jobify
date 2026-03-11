using Jobify.Api.DTOs.Dashboard;

namespace Jobify.Api.Services.Dashboard
{
    public interface IDashboardService
    {
        Task<CandidateDashboardDto?> GetCandidateDashboardAsync(string userId);
    }
}