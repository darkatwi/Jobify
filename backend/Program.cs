// =======================
// Imports
// =======================
// App DB + services
using Jobify.Api.Data;
using Jobify.Api.Services;

// Authentication / Authorization
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using AspNet.Security.OAuth.GitHub;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;

// Database
using Microsoft.EntityFrameworkCore;

// Security / JWT
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;

// Swagger / API docs
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// =======================
// Services (Dependency Injection)
// =======================

// Enables API controllers ([ApiController])
builder.Services.AddControllers();

// -----------------------
// Database (SQL Server)
// -----------------------
// Registers AppDbContext so it can be injected anywhere
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);

// -----------------------
// ASP.NET Identity
// -----------------------
// Handles users, roles, passwords, hashing, tokens, etc.
builder.Services
    .AddIdentity<IdentityUser, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// Token lifetime for:
// - Email confirmation
// - Password reset
builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
{
    options.TokenLifespan = TimeSpan.FromMinutes(30);
});

// -----------------------
// CORS (allow frontend to call backend)
// -----------------------
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy
            // Only allow requests coming from localhost (dev)
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

// -----------------------
// Custom services
// -----------------------
// Service that creates JWT tokens on login
builder.Services.AddScoped<JwtTokenService>();

// -----------------------
// Authentication
// -----------------------
builder.Services
    .AddAuthentication(options =>
    {
        // Use JWT by default
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })

    // JWT authentication (normal login)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],

            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)
            ),

            // Makes [Authorize(Roles="Admin")] work
            RoleClaimType = ClaimTypes.Role
        };
    })

    // Cookie used ONLY for external OAuth (Google / GitHub)
    .AddCookie("External")

    // Google OAuth login
    .AddGoogle("Google", options =>
    {
        options.SignInScheme = "External";
        options.ClientId = builder.Configuration["Authentication:Google:ClientId"]!;
        options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"]!;
        options.SaveTokens = true;
        options.Scope.Add("email");
        options.Scope.Add("profile");
    })

    // GitHub OAuth login
    .AddGitHub("GitHub", options =>
    {
        options.SignInScheme = "External";
        options.ClientId = builder.Configuration["Authentication:GitHub:ClientId"]!;
        options.ClientSecret = builder.Configuration["Authentication:GitHub:ClientSecret"]!;
        options.SaveTokens = true;
        options.Scope.Add("user:email");
    });

// -----------------------
// Authorization
// -----------------------
builder.Services.AddAuthorization();

// -----------------------
// Swagger (API documentation)
// -----------------------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    // Tell Swagger how JWT auth works
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    // Apply JWT security to all endpoints
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// =======================
// Seed roles + admin user
// =======================
// Runs once at startup
using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    // Ensure required roles exist
    var roles = new[] { "Admin", "Recruiter", "Student" };
    foreach (var r in roles)
    {
        if (!await roleManager.RoleExistsAsync(r))
            await roleManager.CreateAsync(new IdentityRole(r));
    }

    // Optional: seed admin account from config
    var adminEmail = config["SeedAdmin:Email"];
    var adminPassword = config["SeedAdmin:Password"];

    if (!string.IsNullOrWhiteSpace(adminEmail) && !string.IsNullOrWhiteSpace(adminPassword))
    {
        var admin = await userManager.FindByEmailAsync(adminEmail);

        if (admin == null)
        {
            admin = new IdentityUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true
            };

            var createRes = await userManager.CreateAsync(admin, adminPassword);
            if (!createRes.Succeeded)
                throw new Exception(
                    "Admin seed failed: " +
                    string.Join(", ", createRes.Errors.Select(e => e.Description))
                );
        }

        if (!await userManager.IsInRoleAsync(admin, "Admin"))
            await userManager.AddToRoleAsync(admin, "Admin");
    }
}

// =======================
// Middleware pipeline
// =======================

if (app.Environment.IsDevelopment())
{
    // Enable Swagger UI only in development
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Apply CORS policy
app.UseCors("AllowFrontend");

// Authentication must come before Authorization
app.UseAuthentication();
app.UseAuthorization();

// Map controller endpoints
app.MapControllers();

// Start the application
app.Run();
