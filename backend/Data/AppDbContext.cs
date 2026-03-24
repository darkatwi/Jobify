using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Jobify.Api.Models;

namespace Jobify.Api.Data;

public class AppDbContext : IdentityDbContext<IdentityUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // =========================
    // STUDENT
    // =========================
    public DbSet<StudentProfile> StudentProfiles => Set<StudentProfile>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<StudentSkill> StudentSkills => Set<StudentSkill>();
    public DbSet<StudentEducation> StudentEducations => Set<StudentEducation>();
    public DbSet<StudentExperience> StudentExperiences => Set<StudentExperience>();
    public DbSet<StudentProject> StudentProjects => Set<StudentProject>();
    public DbSet<StudentInterest> StudentInterests => Set<StudentInterest>();
    public DbSet<PortfolioDocument> PortfolioDocuments => Set<PortfolioDocument>();

    public DbSet<Notification> Notifications { get; set; }
    
    // =========================
    // OPPORTUNITIES
    // =========================
    public DbSet<Opportunity> Opportunities => Set<Opportunity>();
    public DbSet<OpportunitySkill> OpportunitySkills => Set<OpportunitySkill>();
    public DbSet<OpportunityQuestion> OpportunityQuestions => Set<OpportunityQuestion>();
    public DbSet<SavedOpportunity> SavedOpportunities => Set<SavedOpportunity>();

    // =========================
    // APPLICATION FLOW
    // =========================
    public DbSet<Application> Applications => Set<Application>();
    public DbSet<ApplicationAssessment> ApplicationAssessments => Set<ApplicationAssessment>();
    public DbSet<ProctorEvent> ProctorEvents => Set<ProctorEvent>();

    // =========================
    // AUTH / RECRUITER
    // =========================
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<RecruiterProfile> RecruiterProfiles => Set<RecruiterProfile>();
    public DbSet<Interview> Interviews => Set<Interview>();
    public DbSet<OpportunityReport> OpportunityReports => Set<OpportunityReport>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // =========================
        // StudentProfile -> IdentityUser (1:1)
        // =========================
        modelBuilder.Entity<StudentProfile>()
            .HasOne<IdentityUser>()
            .WithOne()
            .HasForeignKey<StudentProfile>(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // =========================
        // StudentEducation -> StudentProfile
        // =========================
        modelBuilder.Entity<StudentEducation>()
            .HasOne<StudentProfile>()
            .WithMany()
            .HasForeignKey(x => x.StudentUserId)
            .OnDelete(DeleteBehavior.Cascade);

        // StudentExperience -> StudentProfile
        modelBuilder.Entity<StudentExperience>()
            .HasOne<StudentProfile>()
            .WithMany()
            .HasForeignKey(x => x.StudentUserId)
            .OnDelete(DeleteBehavior.Cascade);

        // StudentProject -> StudentProfile
        modelBuilder.Entity<StudentProject>()
            .HasOne<StudentProfile>()
            .WithMany()
            .HasForeignKey(x => x.StudentUserId)
            .OnDelete(DeleteBehavior.Cascade);

        // StudentInterest -> StudentProfile
        modelBuilder.Entity<StudentInterest>()
            .HasOne<StudentProfile>()
            .WithMany()
            .HasForeignKey(x => x.StudentUserId)
            .OnDelete(DeleteBehavior.Cascade);

        // StudentSkill -> StudentProfile
        modelBuilder.Entity<StudentSkill>()
            .HasOne<StudentProfile>()
            .WithMany()
            .HasForeignKey(x => x.StudentUserId)
            .OnDelete(DeleteBehavior.Cascade);

        // StudentSkill -> Skill
        modelBuilder.Entity<StudentSkill>()
            .HasOne<Skill>()
            .WithMany()
            .HasForeignKey(x => x.SkillId)
            .OnDelete(DeleteBehavior.Cascade);

        // =========================
        // OpportunitySkill
        // =========================
        modelBuilder.Entity<OpportunitySkill>()
            .HasOne(os => os.Opportunity)
            .WithMany(o => o.OpportunitySkills)
            .HasForeignKey(os => os.OpportunityId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OpportunitySkill>()
            .HasOne(os => os.Skill)
            .WithMany()
            .HasForeignKey(os => os.SkillId)
            .OnDelete(DeleteBehavior.Cascade);

        // =========================
        // SavedOpportunity
        // =========================
        modelBuilder.Entity<SavedOpportunity>()
            .HasIndex(x => new { x.UserId, x.OpportunityId })
            .IsUnique();

        modelBuilder.Entity<SavedOpportunity>()
            .HasOne(x => x.Opportunity)
            .WithMany()
            .HasForeignKey(x => x.OpportunityId)
            .OnDelete(DeleteBehavior.Cascade);

        // =========================
        // Application Constraints
        // =========================
        modelBuilder.Entity<Application>()
            .HasIndex(a => new { a.StudentUserId, a.OpportunityId })
            .IsUnique();

        // ApplicationAssessment -> Application (1:1)
        modelBuilder.Entity<ApplicationAssessment>()
            .HasOne(a => a.Application)
            .WithOne(app => app.Assessment)
            .HasForeignKey<ApplicationAssessment>(a => a.ApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        // ProctorEvent -> ApplicationAssessment (many-to-one)
        modelBuilder.Entity<ProctorEvent>()
            .HasOne(e => e.Assessment)
            .WithMany()
            .HasForeignKey(e => e.ApplicationAssessmentId)
            .OnDelete(DeleteBehavior.Cascade);

        // OpportunityReport
        modelBuilder.Entity<OpportunityReport>()
            .HasOne(r => r.Opportunity)
            .WithMany()
            .HasForeignKey(r => r.OpportunityId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OpportunityReport>()
            .HasIndex(r => new { r.OpportunityId, r.ReporterUserId, r.Reason });

        // =========================
        // Notifications
        // =========================
        modelBuilder.Entity<Notification>()
            .HasKey(n => n.Id);

        modelBuilder.Entity<Notification>()
            .Property(n => n.Title)
            .HasMaxLength(200);

        modelBuilder.Entity<Notification>()
            .Property(n => n.Message)
            .HasMaxLength(1000);

        modelBuilder.Entity<Notification>()
            .Property(n => n.Type)
            .HasMaxLength(100);

        modelBuilder.Entity<Notification>()
            .Property(n => n.UserId)
            .IsRequired();
    }
}