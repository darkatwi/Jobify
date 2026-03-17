namespace Jobify.Api.Models
{
    public class SavedOpportunity
    {
        public int Id { get; set; }

        public string UserId { get; set; } = "";
        public int OpportunityId { get; set; }

        public DateTime SavedAtUtc { get; set; } = DateTime.UtcNow;

        public Opportunity Opportunity { get; set; } = null!;
    }
}