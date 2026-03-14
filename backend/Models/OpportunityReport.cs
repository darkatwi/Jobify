using System.ComponentModel.DataAnnotations;

namespace Jobify.Api.Models
{
    public class OpportunityReport
    {
        public int Id { get; set; }

        [Required]
        public int OpportunityId { get; set; }

        [Required]
        public string ReporterUserId { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string Reason { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Details { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsResolved { get; set; } = false;

        // navigation
        public Opportunity? Opportunity { get; set; }
    }
}
