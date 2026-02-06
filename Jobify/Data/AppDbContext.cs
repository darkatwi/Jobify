using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Jobify.Api.Models;

namespace Jobify.Api.Data;

public class AppDbContext : IdentityDbContext<IdentityUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<StudentProfile> StudentProfiles => Set<StudentProfile>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<StudentSkill> StudentSkills => Set<StudentSkill>();
    public DbSet<PortfolioDocument> PortfolioDocuments => Set<PortfolioDocument>();

    public DbSet<Opportunity> Opportunities => Set<Opportunity>();
    public DbSet<OpportunitySkill> OpportunitySkills => Set<OpportunitySkill>();

    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    public DbSet<RecruiterProfile> RecruiterProfiles => Set<RecruiterProfile>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // StudentProfile -> IdentityUser (1:1)
        modelBuilder.Entity<StudentProfile>()
            .HasOne<IdentityUser>()
            .WithOne()
            .HasForeignKey<StudentProfile>(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // StudentSkill -> StudentProfile (many-to-one)
        modelBuilder.Entity<StudentSkill>()
            .HasOne<StudentProfile>()
            .WithMany()
            .HasForeignKey(x => x.StudentUserId)
            .OnDelete(DeleteBehavior.Cascade);

        // StudentSkill -> Skill (many-to-one)
        modelBuilder.Entity<StudentSkill>()
            .HasOne<Skill>()
            .WithMany()
            .HasForeignKey(x => x.SkillId)
            .OnDelete(DeleteBehavior.Cascade);

        // OpportunitySkill -> Opportunity (many-to-one)
        modelBuilder.Entity<OpportunitySkill>()
            .HasOne(os => os.Opportunity)
            .WithMany(o => o.OpportunitySkills)
            .HasForeignKey(os => os.OpportunityId)
            .OnDelete(DeleteBehavior.Cascade);

        // OpportunitySkill -> Skill (many-to-one)
        modelBuilder.Entity<OpportunitySkill>()
            .HasOne(os => os.Skill)
            .WithMany()
            .HasForeignKey(os => os.SkillId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
