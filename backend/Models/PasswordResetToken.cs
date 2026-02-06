namespace Jobify.Api.Models;

//to reset password via token
public class PasswordResetToken
{
    public int Id { get; set; } //token id (pk) 
    public int UserId { get; set; } //which user is requesting (fk) Users.Id
    public string Token { get; set; } = ""; //reset token string
    public DateTime ExpiresAt { get; set; } //invalid after..?
    public DateTime? UsedAt { get; set; } //when was it used
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; //when created?
}
