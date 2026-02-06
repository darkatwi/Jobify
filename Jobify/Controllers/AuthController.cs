// AuthController
// --------------
// Handles authentication and account lifecycle for Jobify.
//
// Responsibilities:
// - User registration (Student / Recruiter)
// - Login with role-based access control
// - Email confirmation & password reset
// - Recruiter verification flow (email + admin approval)
// - External login (Google / GitHub)
// - Admin actions: approve / reject recruiters
//
// Uses ASP.NET Identity for secure user & role management.



using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Jobify.Api.Services;
using Microsoft.Extensions.Configuration;

using System.Net;
using System.Net.Mail;

// OAuth
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;

// DB
using Microsoft.EntityFrameworkCore;
using Jobify.Api.Data;
using Jobify.Api.Models;

using Microsoft.AspNetCore.Authorization;

namespace Jobify.Api.Controllers;

// AuthController
// --------------
// API controller responsible for authentication and authorization logic.
// It manages user accounts, roles, login flows, and security-related actions.
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    // ASP.NET Identity managers:
    // - UserManager: creates and manages users (passwords, email confirmation, etc.)
    // - SignInManager: handles login checks (password validation, lockouts)
    // - RoleManager: creates and assigns roles (Student, Recruiter, Admin)
    private readonly UserManager<IdentityUser> _userManager;
    private readonly SignInManager<IdentityUser> _signInManager;
    private readonly RoleManager<IdentityRole> _roleManager;

    // Custom service that generates JWT tokens for authenticated users
    private readonly JwtTokenService _jwt;

    // Access to app configuration (appsettings.json, env variables)
    private readonly IConfiguration _config;

    // Database context for accessing application-specific tables
    // (e.g. RecruiterProfiles, verification status, etc.)
    private readonly AppDbContext _db;

    // Temporary in-memory store for external OAuth logins (Google / GitHub)
    // Used to prevent automatic login and force a confirmation step on frontend
    // Key: one-time code, Value: user email + expiration time
    private static readonly Dictionary<string, (string Email, DateTime ExpiresAtUtc)> _oauthTemp = new();

    // Constructor with dependency injection
    // ASP.NET Core automatically provides these services at runtime
    public AuthController(
        UserManager<IdentityUser> userManager,
        SignInManager<IdentityUser> signInManager,
        RoleManager<IdentityRole> roleManager,
        JwtTokenService jwt,
        IConfiguration config,
        AppDbContext db)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _jwt = jwt;
        _config = config;
        _db = db;
    }


    // =====================================================
    // REGISTER (Student / Recruiter)
    // =====================================================
    // Recruiter flow:
    // 1) Create Identity user (EmailConfirmed = false)
    // 2) Assign Recruiter role
    // 3) Create RecruiterProfile (EmailPending)
    // 4) Send email confirmation link
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        // basic guards
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Email and Password are required.");

        var email = request.Email.Trim().ToLower();

        // Check existing
        var existing = await _userManager.FindByEmailAsync(email);
        if (existing != null)
            return BadRequest("Email already exists.");

        // Normalize role
        var roleInput = (request.Role ?? "").Trim().ToLower();
        var role = roleInput == "recruiter" ? "Recruiter" : "Student";

        // Recruiter requires company name
        if (role == "Recruiter" && string.IsNullOrWhiteSpace(request.CompanyName))
            return BadRequest("CompanyName is required for recruiters.");

        // Recruiter requires at least 1 link (website/linkedin/instagram)
        if (role == "Recruiter")
        {
            var hasAnyLink =
                !string.IsNullOrWhiteSpace(request.WebsiteUrl) ||
                !string.IsNullOrWhiteSpace(request.LinkedinUrl) ||
                !string.IsNullOrWhiteSpace(request.InstagramUrl);

            if (!hasAnyLink)
                return BadRequest("Please provide at least one official link (Website, LinkedIn, or Instagram).");
        }

        // Create Identity user
        var user = new IdentityUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = false
        };

        var createRes = await _userManager.CreateAsync(user, request.Password);
        if (!createRes.Succeeded)
            return BadRequest(createRes.Errors.Select(e => e.Description));

        // Ensure role exists
        await EnsureRoleExists(role);

        // Assign role
        await _userManager.AddToRoleAsync(user, role);

        // If Recruiter: create recruiter profile + send email confirmation
        if (role == "Recruiter")
        {
            var domain = email.Split('@').LastOrDefault()?.ToLower();

            var profile = new RecruiterProfile
            {
                UserId = user.Id,
                CompanyName = request.CompanyName!.Trim(),
                EmailDomain = domain,

                //links for admin verification
                WebsiteUrl = request.WebsiteUrl?.Trim(),
                LinkedinUrl = request.LinkedinUrl?.Trim(),
                InstagramUrl = request.InstagramUrl?.Trim(),

                VerificationStatus = RecruiterVerificationStatus.EmailPending,
                CreatedAtUtc = DateTime.UtcNow
            };

            _db.RecruiterProfiles.Add(profile);
            await _db.SaveChangesAsync();

            // Send confirmation email (failure should not destroy user creation)
            try
            {
                await SendRecruiterConfirmEmail(user);
            }
            catch
            {
                // user exists; they can still hit "resend confirmation"
                return Ok(new
                {
                    message = "Recruiter created, but failed to send verification email. Please use resend-confirmation.",
                    userId = user.Id
                });
            }

            return Ok(new
            {
                message = "Recruiter created. Please confirm your email, then wait for admin approval.",
                userId = user.Id
            });
        }

        // Students: you can choose to require email verification later too
        return Ok("User created successfully.");
    }

    // =====================================================
    // RESEND CONFIRMATION EMAIL (Recruiter)
    // =====================================================
    [HttpPost("resend-confirmation")]
    public async Task<IActionResult> ResendConfirmation([FromBody] ResendConfirmationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest("Email is required.");

        var email = request.Email.Trim().ToLower();
        var user = await _userManager.FindByEmailAsync(email);

        // Do not reveal existence
        if (user == null)
            return Ok(new { message = "If your email exists, a confirmation link has been sent." });

        var roles = await _userManager.GetRolesAsync(user);
        if (!roles.Contains("Recruiter"))
            return Ok(new { message = "If your email exists, a confirmation link has been sent." });

        if (user.EmailConfirmed)
            return Ok(new { message = "Email already confirmed." });

        await SendRecruiterConfirmEmail(user);
        return Ok(new { message = "Confirmation email sent." });
    }

    // =====================================================
    // CONFIRM EMAIL
    // =====================================================
    // Confirms Identity email confirmation token.
    // If recruiter: EmailPending -> Pending (waiting admin)
    [HttpGet("confirm-email")]
    public async Task<IActionResult> ConfirmEmail(
    [FromQuery] string userId,
    [FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(token))
            return BadRequest("Invalid confirmation request.");

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
            return BadRequest("Invalid user.");

        var decodedToken = Uri.UnescapeDataString(token);

        var result = await _userManager.ConfirmEmailAsync(user, decodedToken);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        var roles = await _userManager.GetRolesAsync(user);
        var waitingAdmin = false;

        if (roles.Contains("Recruiter"))
        {
            var prof = await _db.RecruiterProfiles
                .FirstOrDefaultAsync(r => r.UserId == userId);

            if (prof != null)
            {
                if (prof.VerificationStatus == RecruiterVerificationStatus.EmailPending)
                    prof.VerificationStatus = RecruiterVerificationStatus.Pending;

                prof.EmailConfirmedAtUtc = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }

            waitingAdmin = true;
        }

        //REDIRECT TO FRONTEND PAGE
        var frontendBase =
            _config["Frontend:BaseUrl"]
            ?? _config["FrontendUrl"]
            ?? "http://localhost:5173";

        var redirectUrl = waitingAdmin
            ? $"{frontendBase}/email-confirmed?status=waiting_admin"
            : $"{frontendBase}/email-confirmed?status=confirmed";

        return Redirect(redirectUrl);
    }


    // =====================================================
    // LOGIN
    // =====================================================
    // Recruiter login rules:
    // - must confirm email
    // - must be admin Verified
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return Unauthorized("Invalid email or password");

        var email = request.Email.Trim().ToLower();
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
            return Unauthorized("Invalid email or password");

        var signInRes = await _signInManager.CheckPasswordSignInAsync(
            user, request.Password, lockoutOnFailure: false);

        if (!signInRes.Succeeded)
            return Unauthorized("Invalid email or password");

        var roles = await _userManager.GetRolesAsync(user);

        // Recruiter gating
        if (roles.Contains("Recruiter"))
        {
            if (!user.EmailConfirmed)
                return StatusCode(403, "Please confirm your company email before logging in.");

            var prof = await _db.RecruiterProfiles.AsNoTracking().FirstOrDefaultAsync(r => r.UserId == user.Id);
            if (prof == null)
                return StatusCode(403, "Recruiter profile not found.");

            if (prof.VerificationStatus != RecruiterVerificationStatus.Verified)
            {
                return prof.VerificationStatus switch
                {
                    RecruiterVerificationStatus.EmailPending => StatusCode(403, "Please confirm your company email before logging in."),
                    RecruiterVerificationStatus.Pending => StatusCode(403, "Your organization is pending admin approval."),
                    RecruiterVerificationStatus.Rejected => StatusCode(403, "Your organization request was rejected."),
                    _ => StatusCode(403, "Recruiter account not verified.")
                };
            }
        }

        var token = _jwt.CreateToken(user, roles, out var expiresAt);

        return Ok(new
        {
            token,
            expiresAt,
            userId = user.Id,
            email = user.Email,
            roles
        });
    }

    // =====================================================
    // ADMIN: list pending recruiters
    // =====================================================
    // Add Admin role later; for now it’s ready.
    [Authorize(Roles = "Admin")]
    [HttpGet("admin/pending-recruiters")]
    public async Task<IActionResult> GetPendingRecruiters()
    {
        var items = await _db.RecruiterProfiles
            .AsNoTracking()
            .Where(r => r.VerificationStatus == RecruiterVerificationStatus.Pending)
            .OrderByDescending(r => r.CreatedAtUtc)
            .Select(r => new
            {
                r.UserId,
                r.CompanyName,
                r.EmailDomain,

                // ✅ ADDED: links for admin review
                r.WebsiteUrl,
                r.LinkedinUrl,
                r.InstagramUrl,

                r.VerificationStatus,
                r.CreatedAtUtc,
                r.EmailConfirmedAtUtc
            })
            .ToListAsync();

        return Ok(items);
    }

    // =====================================================
    // ADMIN: approve recruiter
    // =====================================================
    [Authorize(Roles = "Admin")]
    [HttpPost("admin/approve-recruiter/{userId}")]
    public async Task<IActionResult> ApproveRecruiter(string userId)
    {
        var prof = await _db.RecruiterProfiles.FirstOrDefaultAsync(r => r.UserId == userId);
        if (prof == null) return NotFound("Recruiter profile not found.");

        // ✅ avoid double approve + double email
        if (prof.VerificationStatus == RecruiterVerificationStatus.Verified)
            return Ok(new { message = "Recruiter already approved." });

        prof.VerificationStatus = RecruiterVerificationStatus.Verified;
        prof.VerifiedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // ✅ get user email from Identity
        var user = await _userManager.FindByIdAsync(userId);
        if (user != null && !string.IsNullOrWhiteSpace(user.Email))
        {
            try
            {
                var html = BuildRecruiterApprovedEmail(prof.CompanyName);
                await SendEmail(
                    to: user.Email!,
                    subject: "Jobify - Your recruiter account is approved ✅",
                    htmlBody: html
                );
            }
            catch
            {
                // Don't fail approval if SMTP fails
                return Ok(new
                {
                    message = "Recruiter approved, but failed to send approval email."
                });
            }
        }

        return Ok(new { message = "Recruiter approved." });
    }


    // =====================================================
    // ADMIN: reject recruiter
    // =====================================================
    [Authorize(Roles = "Admin")]
    [HttpPost("admin/reject-recruiter/{userId}")]
    public async Task<IActionResult> RejectRecruiter(string userId, [FromBody] RejectRecruiterRequest body)
    {
        // 1) Get profile + user
        var prof = await _db.RecruiterProfiles.FirstOrDefaultAsync(r => r.UserId == userId);
        if (prof == null) return NotFound("Recruiter profile not found.");

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return NotFound("User not found.");

        var reason = string.IsNullOrWhiteSpace(body?.Reason)
            ? "Your organization could not be verified at this time."
            : body.Reason.Trim();

        // 2) Send rejection email BEFORE deleting user
        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            try
            {
                var html = BuildRecruiterRejectedEmail(prof.CompanyName, reason);
                await SendEmail(
                    to: user.Email!,
                    subject: "Jobify - Recruiter request not approved",
                    htmlBody: html
                );
            }
            catch
            {
   
            }
        }

        // 3) Delete from DB (profile + identity user)
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            // Delete recruiter profile first (avoids FK issues if cascade isn't configured)
            _db.RecruiterProfiles.Remove(prof);
            await _db.SaveChangesAsync();

            // Delete Identity user (should also remove roles/claims/logins tokens via Identity schema)
            var delRes = await _userManager.DeleteAsync(user);
            if (!delRes.Succeeded)
            {
                await tx.RollbackAsync();
                return StatusCode(500, delRes.Errors.Select(e => e.Description));
            }

            await tx.CommitAsync();
            return Ok(new { message = "Recruiter rejected and user deleted." });
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            return StatusCode(500, new { message = "Failed to reject/delete user.", detail = ex.Message });
        }
    }


    // =====================================================
    // FORGOT PASSWORD (EMAIL)
    // =====================================================
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email is required" });

        var email = request.Email.Trim().ToLower();
        var user = await _userManager.FindByEmailAsync(email);

        // do not reveal
        if (user == null)
            return Ok(new { message = "If your email exists, a reset link has been sent." });

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);

        var frontendUrl = _config["Frontend:BaseUrl"] ?? _config["FrontendUrl"] ?? "https://localhost:63303";
        var resetLink =
            $"{frontendUrl}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(token)}";

        try
        {
            await SendEmail(
                to: user.Email!,
                subject: "Jobify - Password Reset Request",
                htmlBody: BuildResetPasswordEmail(user.UserName ?? user.Email ?? "User", resetLink)
            );

            return Ok(new { message = "If your email exists, a reset link has been sent." });
        }
        catch
        {
            return StatusCode(500, new { message = "Failed to send email." });
        }
    }

    // =====================================================
    // RESET PASSWORD
    // =====================================================
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Token) ||
            string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest(new { message = "Invalid request" });

        var email = request.Email.Trim().ToLower();
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
            return BadRequest("Invalid request.");

        var decodedToken = Uri.UnescapeDataString(request.Token);

        var result = await _userManager.ResetPasswordAsync(user, decodedToken, request.NewPassword);

        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok("Password reset successfully.");
    }

    // =====================================================
    // EXTERNAL LOGIN (Google/GitHub)
    // =====================================================
    [HttpGet("external/{provider}")]
    public async Task<IActionResult> ExternalLogin(string provider)
    {
        if (provider is not ("Google" or "GitHub"))
            return BadRequest("Unsupported provider");

        //clear external cookie so it doesn't auto-complete weirdly
        await HttpContext.SignOutAsync("External");

        var redirectUrl = Url.Action(nameof(ExternalCallback), "Auth", null, Request.Scheme);

        var props = new AuthenticationProperties { RedirectUri = redirectUrl };

        //GitHub may ignore, but harmless:
        props.Items["prompt"] = "login";

        return Challenge(props, provider);
    }

    [HttpGet("external-callback")]
    public async Task<IActionResult> ExternalCallback()
    {
        var result = await HttpContext.AuthenticateAsync("External");
        if (!result.Succeeded || result.Principal == null)
            return Unauthorized("External authentication failed");

        var email =
            result.Principal.FindFirstValue(ClaimTypes.Email) ??
            result.Principal.FindFirstValue("email");

        if (string.IsNullOrWhiteSpace(email))
            return BadRequest("No email returned from provider");

        email = email.Trim().ToLower();

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            user = new IdentityUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true
            };

            var createRes = await _userManager.CreateAsync(user);
            if (!createRes.Succeeded)
                return BadRequest(createRes.Errors.Select(e => e.Description));

            var role = "Student";
            await EnsureRoleExists(role);
            await _userManager.AddToRoleAsync(user, role);
        }

        //DO NOT auto-login here — create a one-time code and show a screen on frontend
        var code = Guid.NewGuid().ToString("N");
        _oauthTemp[code] = (email, DateTime.UtcNow.AddMinutes(5));

        var frontendBase = _config["Frontend:BaseUrl"] ?? _config["FrontendUrl"] ?? "https://localhost:63303";
        var redirectUrl =
            $"{frontendBase}/oauth-confirm?code={Uri.EscapeDataString(code)}";

        return Redirect(redirectUrl);
    }

    //user clicks "Continue" on /oauth-confirm -> frontend calls this -> NOW we create token
    [HttpPost("external/complete")]
    public async Task<IActionResult> ExternalComplete([FromBody] ExternalCompleteRequest req)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.Code))
            return BadRequest("Missing code.");

        if (!_oauthTemp.TryGetValue(req.Code, out var entry))
            return BadRequest("Invalid or expired code.");

        if (entry.ExpiresAtUtc < DateTime.UtcNow)
        {
            _oauthTemp.Remove(req.Code);
            return BadRequest("Code expired.");
        }

        // one-time use
        _oauthTemp.Remove(req.Code);

        var user = await _userManager.FindByEmailAsync(entry.Email);
        if (user == null)
            return BadRequest("User not found.");

        var roles = await _userManager.GetRolesAsync(user);
        var token = _jwt.CreateToken(user, roles, out var expiresAt);

        return Ok(new
        {
            token,
            expiresAt,
            userId = user.Id,
            email = user.Email,
            roles
        });
    }

    // =====================================================
    // HELPERS
    // =====================================================
    private async Task EnsureRoleExists(string role)
    {
        if (!await _roleManager.RoleExistsAsync(role))
            await _roleManager.CreateAsync(new IdentityRole(role));
    }

    private async Task SendRecruiterConfirmEmail(IdentityUser user)
    {
        // generate token
        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);

        // build link (frontend confirm page OR directly backend - your choice)
        var frontendUrl = _config["Frontend:BaseUrl"] ?? _config["FrontendUrl"] ?? "https://localhost:63303";

        // This goes to FRONTEND: /confirm-email page
        var apiBase = $"{Request.Scheme}://{Request.Host}"; // https://localhost:7176
        var confirmLink =
            $"{apiBase}/api/Auth/confirm-email?userId={Uri.EscapeDataString(user.Id)}&token={Uri.EscapeDataString(token)}";

        var html = BuildRecruiterConfirmEmail(confirmLink);

        await SendEmail(
            to: user.Email!,
            subject: "Jobify - Confirm your recruiter email",
            htmlBody: html
        );
    }

    private string BuildRecruiterApprovedEmail(string companyName)
    {
        companyName = string.IsNullOrWhiteSpace(companyName) ? "your organization" : companyName;

        var frontendUrl = _config["Frontend:BaseUrl"] ?? _config["FrontendUrl"] ?? "https://localhost:63303";
        var loginLink = $"{frontendUrl}/login";

        return $@"
<!doctype html>
<html lang='en'>
<head><meta charset='utf-8' /><meta name='viewport' content='width=device-width, initial-scale=1' />
<title>Account Approved</title></head>
<body style='margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;'>
  <table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='background:#f4f6fb;padding:24px 0;'>
    <tr><td align='center'>
      <table role='presentation' cellpadding='0' cellspacing='0' width='600' style='width:600px;max-width:92%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(16,24,40,0.12);'>
        <tr>
          <td style='background:linear-gradient(135deg,#16a34a,#15803d);padding:22px 24px;'>
            <div style='font-size:18px;color:#ffffff;font-weight:700;'>Jobify</div>
            <div style='font-size:13px;color:rgba(255,255,255,0.9);margin-top:4px;'>Recruiter Approved</div>
          </td>
        </tr>

        <tr><td style='padding:24px;'>
          <div style='font-size:18px;color:#111827;font-weight:700;margin:0 0 8px 0;'>You’re approved ✅</div>
          <div style='font-size:14px;line-height:1.6;color:#374151;margin:0 0 18px 0;'>
            Your recruiter account for <b>{WebUtility.HtmlEncode(companyName)}</b> has been approved by our admin team.
            You can now log in and start posting opportunities.
          </div>

          <table role='presentation' cellpadding='0' cellspacing='0' style='margin:18px 0;'>
            <tr><td align='center' bgcolor='#16a34a' style='border-radius:12px;'>
              <a href='{loginLink}' style='display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:12px;'>
                Log in
              </a>
            </td></tr>
          </table>

          <div style='font-size:12px;line-height:1.6;color:#6b7280;word-break:break-all;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px;'>
            {WebUtility.HtmlEncode(loginLink)}
          </div>
        </td></tr>

        <tr><td style='padding:16px 24px;background:#fafafa;border-top:1px solid #f0f0f0;'>
          <div style='font-size:12px;color:#9ca3af;line-height:1.5;'>© {DateTime.UtcNow.Year} Jobify. All rights reserved.</div>
          <div style='font-size:12px;color:#9ca3af;line-height:1.5;margin-top:4px;'>This is an automated message—please do not reply.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>";
    }


    private async Task SendEmail(string to, string subject, string htmlBody)
    {
        var smtpHost = _config["Smtp:Host"];
        var smtpPort = int.Parse(_config["Smtp:Port"] ?? "587");
        var smtpUser = _config["Smtp:User"];
        var smtpPass = _config["Smtp:Pass"];
        var fromEmail = _config["Smtp:From"];

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            Credentials = new NetworkCredential(smtpUser, smtpPass),
            EnableSsl = true
        };

        var mail = new MailMessage
        {
            From = new MailAddress(fromEmail),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        mail.To.Add(to);

        await client.SendMailAsync(mail);
    }

    private string BuildRecruiterConfirmEmail(string confirmLink)
    {
        return $@"
<!doctype html>
<html lang='en'>
<head><meta charset='utf-8' /><meta name='viewport' content='width=device-width, initial-scale=1' />
<title>Confirm your email</title></head>
<body style='margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;'>
  <table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='background:#f4f6fb;padding:24px 0;'>
    <tr><td align='center'>
      <table role='presentation' cellpadding='0' cellspacing='0' width='600' style='width:600px;max-width:92%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(16,24,40,0.12);'>
        <tr>
          <td style='background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:22px 24px;'>
            <div style='font-size:18px;color:#ffffff;font-weight:700;'>Jobify</div>
            <div style='font-size:13px;color:rgba(255,255,255,0.9);margin-top:4px;'>Recruiter Email Verification</div>
          </td>
        </tr>

        <tr><td style='padding:24px;'>
          <div style='font-size:18px;color:#111827;font-weight:700;margin:0 0 8px 0;'>Confirm your email</div>
          <div style='font-size:14px;line-height:1.6;color:#374151;margin:0 0 18px 0;'>
            Thanks for registering as a recruiter. Please confirm your company email to continue.
          </div>

          <table role='presentation' cellpadding='0' cellspacing='0' style='margin:18px 0;'>
            <tr><td align='center' bgcolor='#2563eb' style='border-radius:12px;'>
              <a href='{confirmLink}' style='display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:12px;'>
                Confirm Email
              </a>
            </td></tr>
          </table>

          <div style='font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px 0;'>If the button doesn't work, copy and paste:</div>
          <div style='font-size:12px;line-height:1.6;color:#6b7280;word-break:break-all;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px;'>
            {WebUtility.HtmlEncode(confirmLink)}
          </div>

          <div style='font-size:13px;line-height:1.6;color:#6b7280;margin:18px 0 0 0;'>
            After confirming, your organization will be sent to admin for approval.
          </div>
        </td></tr>

        <tr><td style='padding:16px 24px;background:#fafafa;border-top:1px solid #f0f0f0;'>
          <div style='font-size:12px;color:#9ca3af;line-height:1.5;'>© {DateTime.UtcNow.Year} Jobify. All rights reserved.</div>
          <div style='font-size:12px;color:#9ca3af;line-height:1.5;margin-top:4px;'>This is an automated message—please do not reply.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>";
    }

    private string BuildResetPasswordEmail(string displayName, string resetLink)
    {
        return $@"
<!doctype html>
<html lang='en'>
<head><meta charset='utf-8' /><meta name='viewport' content='width=device-width, initial-scale=1' />
<title>Password Reset</title></head>
<body style='margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;'>
  <table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='background:#f4f6fb;padding:24px 0;'>
    <tr><td align='center'>
      <table role='presentation' cellpadding='0' cellspacing='0' width='600' style='width:600px;max-width:92%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(16,24,40,0.12);'>
        <tr><td style='background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:22px 24px;'>
          <div style='font-size:18px;color:#ffffff;font-weight:700;'>Jobify</div>
          <div style='font-size:13px;color:rgba(255,255,255,0.9);margin-top:4px;'>Password Reset Request</div>
        </td></tr>

        <tr><td style='padding:24px;'>
          <div style='font-size:18px;color:#111827;font-weight:700;margin:0 0 8px 0;'>Hello {WebUtility.HtmlEncode(displayName)},</div>
          <div style='font-size:14px;line-height:1.6;color:#374151;margin:0 0 18px 0;'>
            We received a request to reset your password. Click below to choose a new one.
          </div>

          <table role='presentation' cellpadding='0' cellspacing='0' style='margin:18px 0;'>
            <tr><td align='center' bgcolor='#2563eb' style='border-radius:12px;'>
              <a href='{resetLink}' style='display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:12px;'>
                Reset Password
              </a>
            </td></tr>
          </table>

          <div style='font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px 0;'>If the button doesn't work, copy and paste:</div>
          <div style='font-size:12px;line-height:1.6;color:#6b7280;word-break:break-all;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px;'>
            {WebUtility.HtmlEncode(resetLink)}
          </div>

          <div style='font-size:13px;line-height:1.6;color:#6b7280;margin:18px 0 0 0;'>
            If you didn’t request this, you can safely ignore this email.
          </div>
        </td></tr>

        <tr><td style='padding:16px 24px;background:#fafafa;border-top:1px solid #f0f0f0;'>
          <div style='font-size:12px;color:#9ca3af;line-height:1.5;'>© {DateTime.UtcNow.Year} Jobify. All rights reserved.</div>
          <div style='font-size:12px;color:#9ca3af;line-height:1.5;margin-top:4px;'>This is an automated message—please do not reply.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>";
    }

    private string BuildRecruiterRejectedEmail(string companyName, string reason)
    {
        companyName = string.IsNullOrWhiteSpace(companyName) ? "your organization" : companyName;
        reason = string.IsNullOrWhiteSpace(reason) ? "Your organization could not be verified at this time." : reason;

        var frontendUrl = _config["Frontend:BaseUrl"] ?? _config["FrontendUrl"] ?? "http://localhost:5173";
        var supportLink = $"{frontendUrl}/contact"; // or just homepage
        var signupLink = $"{frontendUrl}/signup";

        return $@"
<!doctype html>
<html lang='en'>
<head><meta charset='utf-8' /><meta name='viewport' content='width=device-width, initial-scale=1' />
<title>Recruiter Request Update</title></head>
<body style='margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;'>
  <table role='presentation' cellpadding='0' cellspacing='0' width='100%' style='background:#f4f6fb;padding:24px 0;'>
    <tr><td align='center'>
      <table role='presentation' cellpadding='0' cellspacing='0' width='600' style='width:600px;max-width:92%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(16,24,40,0.12);'>
        <tr>
          <td style='background:linear-gradient(135deg,#ef4444,#b91c1c);padding:22px 24px;'>
            <div style='font-size:18px;color:#ffffff;font-weight:700;'>Jobify</div>
            <div style='font-size:13px;color:rgba(255,255,255,0.9);margin-top:4px;'>Recruiter Request Update</div>
          </td>
        </tr>

        <tr><td style='padding:24px;'>
          <div style='font-size:18px;color:#111827;font-weight:700;margin:0 0 8px 0;'>We couldn’t approve your request</div>

          <div style='font-size:14px;line-height:1.6;color:#374151;margin:0 0 14px 0;'>
            Thanks for applying to register <b>{WebUtility.HtmlEncode(companyName)}</b> as a recruiter on Jobify.
            At this time, your request was not approved.
          </div>

          <div style='font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 10px 0;'>
            <b>Reason:</b>
          </div>

          <div style='font-size:13px;line-height:1.6;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:0 0 16px 0;'>
            {WebUtility.HtmlEncode(reason)}
          </div>

          <div style='font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 18px 0;'>
            If you believe this is a mistake, you can contact us or apply again with updated information/links.
          </div>

          <table role='presentation' cellpadding='0' cellspacing='0' style='margin:18px 0;'>
            <tr>
              <td align='center' bgcolor='#111827' style='border-radius:12px;'>
                <a href='{supportLink}' style='display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:12px;'>
                  Contact support
                </a>
              </td>
              <td style='width:12px;'></td>
              <td align='center' bgcolor='#2563eb' style='border-radius:12px;'>
                <a href='{signupLink}' style='display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:12px;'>
                  Apply again
                </a>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style='padding:16px 24px;background:#fafafa;border-top:1px solid #f0f0f0;'>
          <div style='font-size:12px;color:#9ca3af;line-height:1.5;'>© {DateTime.UtcNow.Year} Jobify. All rights reserved.</div>
          <div style='font-size:12px;color:#9ca3af;line-height:1.5;margin-top:4px;'>This is an automated message—please do not reply.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>";
    }


    // =====================================================
    // DTOs
    // =====================================================
    public record LoginRequest(string Email, string Password);

    public record RegisterRequest(
        string Email,
        string Password,
        string Role,
        string? CompanyName,
        string? WebsiteUrl,
        string? LinkedinUrl,
        string? InstagramUrl
    );

    public record ForgotPasswordRequest(string Email);
    public record ResetPasswordRequest(string Email, string Token, string NewPassword);

    public record ResendConfirmationRequest(string Email);
    public record RejectRecruiterRequest(string? Reason);
    public record ExternalCompleteRequest(string Code);
}
