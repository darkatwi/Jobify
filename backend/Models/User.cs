namespace Jobify.Api.Models;
//stores the accounts for login
public class User
{
    public int Id { get; set; } //pk
    public string Email { get; set; } = "";
    public string HashedPassword { get; set; } = ""; //encrypted password
    public string Role { get; set; } = "Student"; //student or organization- defualt is student
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; //when was the acc created
    public DateTime? UpdatedAt { get; set; } //last time info changed
}
