using Jobify.Api.Data;
using Jobify.Api.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// =======================
// Services (Dependency Injection)
// =======================

// Controllers
// Registers MVC controllers so API endpoints (Controllers/*) can be discovered and mapped.
builder.Services.AddControllers();

// Database
// Registers AppDbContext using SQL Server connection string from appsettings.json:
// "ConnectionStrings:DefaultConnection"
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Identity
// Adds ASP.NET Core Identity for user + role management.
// - Stores users/roles in AppDbContext (EF Core)
// - Adds default token providers (needed for password reset tokens, email confirmation, etc.)
builder.Services
    .AddIdentity<IdentityUser, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// ✅ CORS (allow any localhost port)
// Allows frontend dev servers on localhost with any port (e.g. Vite, React, etc.)
//
// Why SetIsOriginAllowed?
// - It dynamically accepts origins like http://localhost:5173, http://localhost:63303, etc.
// - Prevents allowing non-localhost domains by checking uri.Host == "localhost"
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                    return uri.Host == "localhost";
                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
    );
});

// Services
// JwtTokenService is used by AuthController to generate signed JWT tokens.
builder.Services.AddScoped<JwtTokenService>();

// JWT + OAuth Authentication
// - JWT bearer stays the default for your API calls
// - External cookie is used only during Google/GitHub OAuth handshake
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            // Validate issuer + audience from token claims
            ValidateIssuer = true,
            ValidateAudience = true,

            // Validate token expiry (rejects expired tokens)
            ValidateLifetime = true,

            // Validate token signature using the configured signing key
            ValidateIssuerSigningKey = true,

            // Expected issuer/audience values (must match what JwtTokenService issues)
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],

            // Symmetric key used to verify token signature
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)
            )
        };
    })
    .AddCookie("External")
    .AddGoogle("Google", options =>
    {
        options.SignInScheme = "External";
        options.ClientId = builder.Configuration["Authentication:Google:ClientId"]!;
        options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"]!;
        options.SaveTokens = true;
        options.Scope.Add("email");
        options.Scope.Add("profile");
    })
    .AddGitHub("GitHub", options =>
    {
        options.SignInScheme = "External";
        options.ClientId = builder.Configuration["Authentication:GitHub:ClientId"]!;
        options.ClientSecret = builder.Configuration["Authentication:GitHub:ClientSecret"]!;
        options.SaveTokens = true;
        options.Scope.Add("user:email");
    });

// Authorization
// Enables authorization attributes like [Authorize] and role policies.
builder.Services.AddAuthorization();

// Swagger (API documentation)
// Adds endpoints explorer and Swagger generator for interactive API docs.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// =======================
// Middleware (HTTP pipeline)
// =======================

if (app.Environment.IsDevelopment())
{
    // Swagger UI enabled only in development for easier testing
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// ✅ CORS MUST be before auth
// Ensures preflight requests + browser calls succeed before authentication runs.
app.UseCors("AllowFrontend");

// Authentication: validates JWT and sets HttpContext.User
app.UseAuthentication();

// Authorization: enforces [Authorize] rules based on HttpContext.User
app.UseAuthorization();

// Maps controller routes (e.g. /api/auth/login, /api/users, etc.)
app.MapControllers();

app.Run();
