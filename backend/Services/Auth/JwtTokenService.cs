using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Jobify.Api.Services;

/**
 * JwtTokenService
 * ---------------
 * Responsible for generating JSON Web Tokens (JWT) used for authentication
 * and authorization across the Jobify API.
 *
 * Responsibilities:
 * - Build JWT claims from IdentityUser + assigned roles
 * - Sign token using symmetric key (HMAC SHA-256)
 * - Set token expiration based on configuration
 *
 * Notes:
 * - Token settings are loaded from appsettings.json under the "Jwt" section
 * - This service is intentionally small and focused (single responsibility)
 */
public class JwtTokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config)
    {
        _config = config;
    }

    /**
     * CreateToken
     * -----------
     * Generates a signed JWT for the given user and roles.
     *
     * @param user       Identity user for whom the token is issued
     * @param roles      Roles assigned to the user (e.g. Student, Recruiter, Admin)
     * @param expiresAt  OUT parameter returning the token expiration timestamp (UTC)
     *
     * @return           Serialized JWT string
     */
    public string CreateToken(IdentityUser user, IList<string> roles, out DateTime expiresAt)
    {
        // Load JWT configuration section
        // Expected keys: Key, Issuer, Audience, ExpiresMinutes
        var jwt = _config.GetSection("Jwt");

        // Create symmetric signing key from configured secret
        var keyBytes = Encoding.UTF8.GetBytes(jwt["Key"]!);
        var key = new SymmetricSecurityKey(keyBytes);

        // Use HMAC SHA-256 for signing
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        /**
         * Standard + custom claims included in the token:
         * - sub  : unique user identifier
         * - email: user's email
         * - name : username or email
         * - role : one claim per assigned role
         */
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? ""),
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.UserName ?? user.Email ?? "")
        };

        // Add role claims (used by [Authorize(Roles = "...")])
        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        // Calculate expiration time (UTC)
        expiresAt = DateTime.UtcNow.AddMinutes(int.Parse(jwt["ExpiresMinutes"]!));

        // Build the JWT token
        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds
        );

        // Serialize token to string for client consumption
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
