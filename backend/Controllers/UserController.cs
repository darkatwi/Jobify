using Jobify.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Jobify.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly UserManager<IdentityUser> _userManager;
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context, UserManager<IdentityUser> userManager)
    {   
        _context = context;
        _userManager = userManager;
    }

    // GET: /api/users
    // Returns a list of users with basic identity info + roles.
    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        // Fetch users from Identity store (ordered by email for consistent output)
        var users = await _userManager.Users
            .OrderBy(u => u.Email)
            .ToListAsync();

        // Map IdentityUser -> UserDto to avoid exposing sensitive/internal Identity fields
        var result = new List<UserDto>();

        foreach (var u in users)
        {
            // Retrieve roles for each user (Identity stores roles separately)
            var roles = await _userManager.GetRolesAsync(u);

            result.Add(new UserDto(
                Id: u.Id,
                Email: u.Email ?? "",
                UserName: u.UserName ?? "",
                Roles: roles.ToList()
            ));
        }

        return Ok(result);
    }

    // GET : /api/users/by-role/{role}
    // Retures users based on their role (student/recruiter)
    [Authorize(Roles = "Admin")]
    [HttpGet("by-role/{role}")]
    public async Task<IActionResult> GetUsersByRole(string role)
    {
        // use AppDbContext instead of IdentityUser
        var context = HttpContext.RequestServices.GetRequiredService<AppDbContext>();

        var result = await (
            from u in context.Users
            join ur in context.UserRoles on u.Id equals ur.UserId
            join r in context.Roles on ur.RoleId equals r.Id
            join p in context.StudentProfiles on u.Email equals p.Email
            where r.Name == role
            select new CustomUserDto
            {
                Id = p.UserId,
                Email = u.Email,
                FullName = p.FullName,
                CreatedAt = p.CreatedAt,
                UpdatedAtUtc = p.UpdatedAtUtc
            }
        ).ToListAsync();

        return Ok(result);
    }

    // GET: /api/users/{id}
    // Returns one user's basic identity info + roles by userId.
    //
    // Notes:
    // - Suitable for user detail pages / admin views.
    [Authorize(Roles = "Admin")]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(string id)
    {
        // Lookup user by Identity primary key
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound("User not found.");

        // Fetch roles assigned to this user
        var roles = await _userManager.GetRolesAsync(user);

        // Return a safe DTO (no password hashes or internal fields)
        return Ok(new UserDto(
            Id: user.Id,
            Email: user.Email ?? "",
            UserName: user.UserName ?? "",
            Roles: roles.ToList()
        ));
    }

    //DELETE: /api/users/{id}
    // Deletes a user and related data (RecruiterProfile if exists)
    //
    // Security: Admin only
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        // Find user
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
            return NotFound("User not found.");

        // If user is a recruiter, delete recruiter profile first
        // (prevents FK issues + keeps DB clean)
        var recruiterProfile = await HttpContext.RequestServices
            .GetRequiredService<AppDbContext>()
            .RecruiterProfiles
            .FirstOrDefaultAsync(r => r.UserId == id);

        if (recruiterProfile != null)
        {
            HttpContext.RequestServices
                .GetRequiredService<AppDbContext>()
                .RecruiterProfiles
                .Remove(recruiterProfile);

            await HttpContext.RequestServices
                .GetRequiredService<AppDbContext>()
                .SaveChangesAsync();
        }

        // Delete Identity user
        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok(new { message = "User deleted successfully." });
    }


    // Verify Student
    [Authorize(Roles = "Admin")]
    [HttpPut("admin/students/{id}/verify")]
    public async Task<IActionResult> VerifyStudent(string id)
    {
        var profile = await _context.StudentProfiles.FirstOrDefaultAsync(s => s.UserId == id);
        if (profile == null) return NotFound();

        profile.isVerified = true;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Student verified" });
    }


    // Delete Student
    [Authorize(Roles = "Admin")]
    [HttpDelete("admin/students/{id}")]
    public async Task<IActionResult> DeleteStudent(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        await _userManager.DeleteAsync(user);

        return Ok(new { message = "User deleted" });
    }


    // DTO returned to frontend to keep API response clean and safe
    public record UserDto(string Id, string Email, string UserName, List<string> Roles);

    
    public class CustomUserDto
    {
        public string? Id { get; set; }
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
    };
}