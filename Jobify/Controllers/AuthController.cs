using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Jobify.Api.Services;
using Microsoft.Extensions.Configuration;

using System.Net;
using System.Net.Mail;

namespace Jobify.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<IdentityUser> _userManager;
    private readonly SignInManager<IdentityUser> _signInManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly JwtTokenService _jwt;
    private readonly IConfiguration _config;

    public AuthController(
        UserManager<IdentityUser> userManager,
        SignInManager<IdentityUser> signInManager,
        RoleManager<IdentityRole> roleManager,
        JwtTokenService jwt,
        IConfiguration config)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _jwt = jwt;
        _config = config;
    }

    // =========================
    // REGISTER (Student / Recruiter)
    // =========================
    // Creates a new Identity user, assigns a role, and returns a success message.
    // Security:
    // - Checks if email already exists to avoid duplicate accounts.
    // - Uses ASP.NET Identity to hash + store password securely.
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        // Check for existing user by email
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing != null)
            return BadRequest("Email already exists.");

        // Create Identity user record (email used as username)
        var user = new IdentityUser
        {
            UserName = request.Email,
            Email = request.Email
        };

        // Create user and store hashed password via Identity
        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        // Normalize role input (default = Student if not "recruiter")
        var roleInput = (request.Role ?? "").Trim().ToLower();
        var role = roleInput == "recruiter" ? "Recruiter" : "Student";

        // Ensure role exists in DB before assignment
        if (!await _roleManager.RoleExistsAsync(role))
            await _roleManager.CreateAsync(new IdentityRole(role));

        // Assign user to role
        await _userManager.AddToRoleAsync(user, role);

        return Ok("User created successfully.");
    }

    // =========================
    // LOGIN
    // =========================
    // Validates credentials and returns a JWT token + basic user session info.
    // Notes:
    // - Uses CheckPasswordSignInAsync to validate credentials.
    // - Token creation handled by JwtTokenService (single responsibility).
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        // Look up user by email
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return Unauthorized("Invalid email or password");

        // Validate password (lockoutOnFailure=false means no lockout tracking here)
        var result = await _signInManager.CheckPasswordSignInAsync(
            user, request.Password, lockoutOnFailure: false);

        if (!result.Succeeded)
            return Unauthorized("Invalid email or password");

        // Fetch roles to include in JWT claims / authorization
        var roles = await _userManager.GetRolesAsync(user);

        // Issue JWT + expiry timestamp
        var token = _jwt.CreateToken(user, roles, out var expiresAt);

        // Return payload used by frontend for session storage
        return Ok(new
        {
            token,
            expiresAt,
            userId = user.Id,
            email = user.Email,
            roles
        });
    }

    // =========================
    // FORGOT PASSWORD (EMAIL)
    // Sends reset link to user's email
    // =========================
    // Flow:
    // - Accept email
    // - If user exists: generate reset token + email link
    // - If user does NOT exist: still return OK (prevents user enumeration)
    // Security:
    // - Never reveals whether email exists.
    // - Token is URL-encoded before being inserted into link.
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        // Basic input guard
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email is required" });

        // Find user (may be null)
        var user = await _userManager.FindByEmailAsync(request.Email);

        // Security best practice: do NOT reveal if the email exists
        if (user == null)
            return Ok(new { message = "If your email exists, a reset link has been sent." });

        // Generate password reset token using ASP.NET Identity
        var token = await _userManager.GeneratePasswordResetTokenAsync(user);

        // Frontend base URL (configure in appsettings; fallback to local dev)
        var frontendUrl = _config["FrontendUrl"] ?? "https://localhost:63303";

        // IMPORTANT: encode token + email so the link is safe in a URL
        var resetLink =
            $"{frontendUrl}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(token)}";

        try
        {
            // SMTP configuration (appsettings.json / secrets)
            var smtpHost = _config["Smtp:Host"];
            var smtpPort = int.Parse(_config["Smtp:Port"] ?? "587");
            var smtpUser = _config["Smtp:User"];
            var smtpPass = _config["Smtp:Pass"];
            var fromEmail = _config["Smtp:From"];

            // Setup SMTP client for sending mail
            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(smtpUser, smtpPass),
                EnableSsl = true
            };

            // Display name used in the email greeting
            var displayName = user.UserName ?? user.Email ?? "User";

            // HTML email body (styled, includes button + fallback link)
            var htmlBody = $@"
<!doctype html>
<html lang='en'>
<head>
  <meta charset='utf-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1' />
  <title>Password Reset</title>
</head>
<body style='margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;'>
  <table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='background:#f4f6fb;padding:24px 0;'>
    <tr>
      <td align='center'>
        <table role='presentation' cellpadding='0' cellspacing='0' width='600' style='width:600px;max-width:92%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(16,24,40,0.12);'>

          <tr>
            <td style='background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:22px 24px;'>
              <div style='font-size:18px;color:#ffffff;font-weight:700;'>Jobify</div>
              <div style='font-size:13px;color:rgba(255,255,255,0.9);margin-top:4px;'>Password Reset Request</div>
            </td>
          </tr>

          <tr>
            <td style='padding:24px;'>
              <div style='font-size:18px;color:#111827;font-weight:700;margin:0 0 8px 0;'>
                Hello {WebUtility.HtmlEncode(displayName)},
              </div>

              <div style='font-size:14px;line-height:1.6;color:#374151;margin:0 0 18px 0;'>
                We received a request to reset your password. Click the button below to choose a new one.
              </div>

              <table role='presentation' cellpadding='0' cellspacing='0' style='margin:18px 0;'>
                <tr>
                  <td align='center' bgcolor='#2563eb' style='border-radius:12px;'>
                    <a href='{resetLink}'
                       style='display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:12px;'>
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <div style='font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px 0;'>
                If the button doesn't work, copy and paste this link into your browser:
              </div>

              <div style='font-size:12px;line-height:1.6;color:#6b7280;word-break:break-all;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px;'>
                {WebUtility.HtmlEncode(resetLink)}
              </div>

              <div style='font-size:13px;line-height:1.6;color:#6b7280;margin:18px 0 0 0;'>
                If you didn’t request this, you can safely ignore this email.
              </div>
            </td>
          </tr>

          <tr>
            <td style='padding:16px 24px;background:#fafafa;border-top:1px solid #f0f0f0;'>
              <div style='font-size:12px;color:#9ca3af;line-height:1.5;'>
                © {DateTime.UtcNow.Year} Jobify. All rights reserved.
              </div>
              <div style='font-size:12px;color:#9ca3af;line-height:1.5;margin-top:4px;'>
                This is an automated message—please do not reply.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

            // Build email message
            var mail = new MailMessage
            {
                From = new MailAddress(fromEmail),
                Subject = "Jobify - Password Reset Request",
                Body = htmlBody,
                IsBodyHtml = true
            };

            // Send to user's email
            mail.To.Add(user.Email!);

            await client.SendMailAsync(mail);

            // Always return generic success response
            return Ok(new { message = "If your email exists, a reset link has been sent." });
        }
        catch
        {
            // Do not expose internal SMTP failure details
            return StatusCode(500, new { message = "Failed to send email." });
        }
    }

    // =========================
    // RESET PASSWORD
    // =========================
    // Completes reset-password flow using email + reset token + new password.
    // Notes:
    // - Token arrives URL-encoded from frontend; we decode before passing to Identity.
    // - Uses ASP.NET Identity ResetPasswordAsync (handles password hashing/validation).
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        // Validate required fields
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Token) ||
            string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest(new { message = "Invalid request" });

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return BadRequest("Invalid request.");

        // Token comes URL-encoded from frontend query param
        var decodedToken = Uri.UnescapeDataString(request.Token);

        // Reset password (Identity verifies token + applies password rules)
        var result = await _userManager.ResetPasswordAsync(user, decodedToken, request.NewPassword);

        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok("Password reset successfully.");
    }

    // =========================
    // DTOs
    // =========================
    // Request contracts expected by the frontend.
    // Keeping them here keeps this controller self-contained.
    public record LoginRequest(string Email, string Password);
    public record RegisterRequest(string Email, string Password, string Role);

    public record ForgotPasswordRequest(string Email);
    public record ResetPasswordRequest(string Email, string Token, string NewPassword);
}
