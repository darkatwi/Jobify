using System.ComponentModel.DataAnnotations;

namespace Jobify.Api.DTOs;

public class CreateOpportunityReportDto
{
    [Required]
    public string Reason { get; set; } = string.Empty;

    public string? Details { get; set; }
}
