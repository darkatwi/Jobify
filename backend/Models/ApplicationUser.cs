using Microsoft.AspNetCore.Identity;

namespace Jobify.Api.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string? Location { get; set; }
    }
}