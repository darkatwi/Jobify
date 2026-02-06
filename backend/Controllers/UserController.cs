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

    public UsersController(UserManager<IdentityUser> userManager)
    {
        _userManager = userManager;
    }

    // GET: /api/users
    // Returns a list of users with basic identity info + roles.
    //
    // Notes:
    // - Useful for admin dashboards, debugging, and internal tooling.
    // - Currently not protected; recommended to secure with [Authorize] or role-based policy.
    //
    // Security recommendation (later):
    // [Authorize(Roles = "Admin")]
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

    // GET: /api/users/{id}
    // Returns one user's basic identity info + roles by userId.
    //
    // Notes:
    // - Suitable for user detail pages / admin views.
    // - Currently not protected; recommended to secure and/or restrict access.
    //
    // Security recommendation (later): 
    // [Authorize(Roles = "Admin")]
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


    // DTO returned to frontend to keep API response clean and safe
    public record UserDto(string Id, string Email, string UserName, List<string> Roles);
}
