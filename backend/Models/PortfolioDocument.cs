namespace Jobify.Api.Models;

//stores the portfolo unfo used for skill extarcattion
public class PortfolioDocument
{
    public int Id { get; set; } //pk
    public int StudentUserId { get; set; } //who uploaded this doc (fk) for studentProfiles.Userid
    public string SourceType { get; set; } = "Text"; // PDF | Text | Link
    public string? SourceUrl { get; set; }
    public string? RawText { get; set; } //extracted text from the document
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public string ExtractionStatus { get; set; } = "Pending"; // Pending | Done | Failed
}
