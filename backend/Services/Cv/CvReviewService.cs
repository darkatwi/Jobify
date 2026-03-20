using System.Text;
using System.Text.RegularExpressions;
using Jobify.Api.Data;
using Jobify.Api.DTOs;
using Jobify.Api.Models;
using Microsoft.EntityFrameworkCore;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;

namespace Jobify.Api.Services.Cv
{
    public class CvReviewService : ICvReviewService
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        private const int CharsPerPage = 3200;
        private const int MinBullets = 4;
        private const int MaxBullets = 20;

        private enum ResumeTrack
        {
            Software,
            General
        }

        private static readonly string[] SoftwareMajors =
{
    "computer science", "software engineering", "computer engineering",
    "information technology", "informatics", "data science",
    "artificial intelligence", "ai", "cybersecurity", "information systems"
};

        private static readonly string[] SoftwareSignals =
        {
    ".net", "c#", "java", "python", "javascript", "typescript", "react",
    "node", "express", "sql", "mongodb", "mysql", "html", "css",
    "git", "github", "linux", "docker", "api", "rest"
};

        private static ResumeTrack DetectResumeTrack(
            StudentProfile? profile,
            List<StudentEducation> educations,
            List<string> skillNames,
            List<StudentProject> projects,
            string cvText)
        {
            var combinedText = string.Join(" ", new[]
            {
        profile?.EducationText,
        profile?.ExperienceText,
        profile?.ProjectsText,
        profile?.CertificationsText,
        string.Join(" ", educations.Select(e => e.Major)),
        string.Join(" ", skillNames),
        string.Join(" ", projects.Select(p => $"{p.Title} {p.TechStack} {p.Description}")),
        cvText
    }.Where(x => !string.IsNullOrWhiteSpace(x))).ToLowerInvariant();

            bool hasSoftwareMajor = SoftwareMajors.Any(m => combinedText.Contains(m));
            int softwareSignalHits = SoftwareSignals.Count(s => combinedText.Contains(s));

            if (hasSoftwareMajor || softwareSignalHits >= 4)
                return ResumeTrack.Software;

            return ResumeTrack.General;
        }

        private static readonly string[] ActionVerbs =
        {
            "built","developed","implemented","designed","created","led","improved",
            "optimized","managed","analyzed","architected","delivered","launched",
            "reduced","increased","automated","refactored","integrated","deployed",
            "collaborated","mentored","researched","resolved","migrated","scaled",
            "organized","evaluated","engineered","maintained","supported","tested"
        };

        private static readonly string[] FillerWords =
        {
            "responsible for", "duties included", "helped with", "worked on", "involved in"
        };

        private static readonly string[] CommonMisspellings =
        {
            "recieve", "acheive", "managment", "responsability", "knowlege"
        };

        private static readonly string[] SoftwareSuggestedSkills =
{
    "Git", "Docker", "Linux", "SQL", "REST API", "Agile", "CI/CD"
};

        private static readonly string[] GeneralSuggestedSkills =
        {
    "Excel", "PowerPoint", "Communication", "Presentation", "Research", "Teamwork"
};

        private static List<string> GetSuggestedSkillsByTrack(ResumeTrack track)
        {
            return track == ResumeTrack.Software
                ? SoftwareSuggestedSkills.ToList()
                : GeneralSuggestedSkills.ToList();
        }

        public CvReviewService(AppDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        public async Task<CvReviewDto?> GenerateReviewAsync(string userId)
        {
            var profile = await _db.StudentProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            var userEmail = await _db.Users
                .Where(u => u.Id == userId)
                .Select(u => u.Email)
                .FirstOrDefaultAsync();

            var projects = await _db.StudentProjects
                .Where(p => p.StudentUserId == userId)
                .ToListAsync();

            var skillNames = await _db.StudentSkills
                .Where(ss => ss.StudentUserId == userId)
                .Join(_db.Skills, ss => ss.SkillId, s => s.Id, (ss, s) => s.Name)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Distinct()
                .ToListAsync();

            var educations = await _db.StudentEducations
                .Where(e => e.StudentUserId == userId)
                .ToListAsync();

            var experiences = await _db.StudentExperiences
                .Where(e => e.StudentUserId == userId)
                .ToListAsync();

            var rawCvText = await LoadCvTextAsync(profile?.ResumeFileName);

            var structuredProfileText = BuildStructuredProfileText(
                profile,
                educations,
                experiences,
                projects,
                skillNames,
                userEmail
            );

            var rawReviewText = string.Join("\n\n",
                new[]
                {
                    rawCvText,
                    structuredProfileText
                }
                .Where(x => !string.IsNullOrWhiteSpace(x))
            );

            var cvText = NormalizeCvText(rawReviewText);
            var track = DetectResumeTrack(profile, educations, skillNames, projects, cvText);

            if (profile == null &&
                !projects.Any() &&
                !skillNames.Any() &&
                !educations.Any() &&
                !experiences.Any() &&
                string.IsNullOrWhiteSpace(cvText))
            {
                return null;
            }

            var analysis = Analyse(
                cvText,
                rawReviewText,
                skillNames,
                dbProjectCount: projects.Count,
                dbEducationCount: educations.Count,
                dbExperienceCount: experiences.Count,
                track: track);

            var feedback = BuildFeedback(
                analysis,
                skillNames,
                analysis.DetectedProjectCount,
                experiences.Count,
                track);

            var score = ComputeScore(
                analysis,
                analysis.DetectedProjectCount,
                skillNames,
                track);

            return new CvReviewDto
            {
                ResumeScore = score,
                Strengths = feedback.Strengths,
                Warnings = feedback.Warnings,
                Suggestions = feedback.Suggestions,

                SectionChecks = new CvSectionChecksDto
                {
                    HasSkillsSection = analysis.HasSkillsSection,
                    HasEducationSection = analysis.HasEducationSection,
                    HasExperienceSection = analysis.HasExperienceSection,
                    HasProjectsSection = analysis.HasProjectsSection
                },

                ContentQuality = new CvContentQualityDto
                {
                    UsesActionVerbs = analysis.UsesActionVerbs,
                    HasMeasurableAchievements = analysis.HasMeasurableAchievements,
                    BulletCount = analysis.BulletCount
                },

                SkillsCoverage = new CvSkillsCoverageDto
                {
                    DetectedSkills = skillNames,
                    MissingSuggestedSkills = analysis.MissingSkills
                },

                Portfolio = new CvPortfolioDto
                {
                    ProjectCount = analysis.DetectedProjectCount,
                    HasGithubLinks = analysis.HasGithubLinks
                }
            };
        }

        private static string BuildStructuredProfileText(
    StudentProfile? profile,
    List<StudentEducation> educations,
    List<StudentExperience> experiences,
    List<StudentProject> projects,
    List<string> skillNames,
    string? userEmail = null)
        {
            var sb = new StringBuilder();

            if (profile != null || !string.IsNullOrWhiteSpace(userEmail))
            {
                sb.AppendLine("HEADER");

                if (profile != null)
                {
                    if (!string.IsNullOrWhiteSpace(profile.FullName))
                        sb.AppendLine(profile.FullName);

                    if (!string.IsNullOrWhiteSpace(profile.PhoneNumber))
                        sb.AppendLine(profile.PhoneNumber);

                    if (!string.IsNullOrWhiteSpace(profile.PortfolioUrl))
                        sb.AppendLine(profile.PortfolioUrl);

                    if (!string.IsNullOrWhiteSpace(profile.Location))
                        sb.AppendLine(profile.Location);
                }

                if (!string.IsNullOrWhiteSpace(userEmail))
                    sb.AppendLine(userEmail);

                sb.AppendLine();
            }

            if (experiences.Any())
            {
                sb.AppendLine("EXPERIENCE");

                foreach (var e in experiences)
                {
                    var titleCompany = string.Join(" - ",
                        new[] { e.Role, e.Company }
                        .Where(x => !string.IsNullOrWhiteSpace(x)));

                    if (!string.IsNullOrWhiteSpace(titleCompany))
                        sb.AppendLine(titleCompany);

                    if (!string.IsNullOrWhiteSpace(e.Duration))
                        sb.AppendLine(e.Duration);

                    if (!string.IsNullOrWhiteSpace(e.Description))
                    {
                        foreach (var line in SplitIntoBulletLines(e.Description))
                            sb.AppendLine($"• {line}");
                    }

                    sb.AppendLine();
                }
            }

            if (educations.Any())
            {
                sb.AppendLine("EDUCATION");

                foreach (var e in educations)
                {
                    var degreeLine = string.Join(" - ",
                        new[] { e.Degree, e.University }
                        .Where(x => !string.IsNullOrWhiteSpace(x)));

                    if (!string.IsNullOrWhiteSpace(degreeLine))
                        sb.AppendLine(degreeLine);

                    if (!string.IsNullOrWhiteSpace(e.Major))
                        sb.AppendLine($"Major: {e.Major}");

                    if (!string.IsNullOrWhiteSpace(e.GraduationYear))
                        sb.AppendLine($"Graduation Year: {e.GraduationYear}");

                    if (!string.IsNullOrWhiteSpace(e.Gpa))
                        sb.AppendLine($"GPA: {e.Gpa}");

                    sb.AppendLine();
                }
            }

            if (projects.Any())
            {
                sb.AppendLine("PROJECTS");

                foreach (var p in projects)
                {
                    if (!string.IsNullOrWhiteSpace(p.Title))
                        sb.AppendLine(p.Title);

                    if (!string.IsNullOrWhiteSpace(p.TechStack))
                        sb.AppendLine($"Tech: {p.TechStack}");

                    if (!string.IsNullOrWhiteSpace(p.Description))
                    {
                        foreach (var line in SplitIntoBulletLines(p.Description))
                            sb.AppendLine($"• {line}");
                    }

                    if (!string.IsNullOrWhiteSpace(p.Links))
                        sb.AppendLine(p.Links);

                    sb.AppendLine();
                }
            }

            if (skillNames.Any())
            {
                sb.AppendLine("SKILLS");
                sb.AppendLine(string.Join(", ", skillNames));
                sb.AppendLine();
            }

            if (profile != null)
            {
                if (!string.IsNullOrWhiteSpace(profile.CertificationsText))
                {
                    sb.AppendLine("CERTIFICATIONS");
                    sb.AppendLine(profile.CertificationsText);
                    sb.AppendLine();
                }

                if (!string.IsNullOrWhiteSpace(profile.AwardsText))
                {
                    sb.AppendLine("AWARDS");
                    sb.AppendLine(profile.AwardsText);
                    sb.AppendLine();
                }

                if (!string.IsNullOrWhiteSpace(profile.ProjectsText))
                {
                    sb.AppendLine("PROJECTS");
                    sb.AppendLine(profile.ProjectsText);
                    sb.AppendLine();
                }

                if (!string.IsNullOrWhiteSpace(profile.ExperienceText))
                {
                    sb.AppendLine("EXPERIENCE");
                    sb.AppendLine(profile.ExperienceText);
                    sb.AppendLine();
                }

                if (!string.IsNullOrWhiteSpace(profile.EducationText))
                {
                    sb.AppendLine("EDUCATION");
                    sb.AppendLine(profile.EducationText);
                    sb.AppendLine();
                }
            }

            return sb.ToString();
        }

        private CvAnalysis Analyse(
            string cvText,
            string rawCvText,
            List<string> dbSkillNames,
            int dbProjectCount,
            int dbEducationCount,
            int dbExperienceCount,
            ResumeTrack track)
        {
            var lower = cvText.ToLowerInvariant();
            var rawLower = rawCvText.ToLowerInvariant();

            var normalizedLowerNoSpaces = lower.Replace(" ", "");
            var rawLowerNoSpaces = rawLower.Replace(" ", "");

            var sections = ExtractSections(cvText);

            bool hasSkillsSection =
                sections.ContainsKey("skills") ||
                sections.ContainsKey("technical skills") ||
                dbSkillNames.Any() ||
                Regex.IsMatch(lower, @"(^|\n)\s*(technical\s+)?skills\s*$", RegexOptions.IgnoreCase | RegexOptions.Multiline);

            bool hasEducationSection =
                sections.ContainsKey("education") ||
                dbEducationCount > 0 ||
                Regex.IsMatch(lower, @"(^|\n)\s*education\s*$", RegexOptions.IgnoreCase | RegexOptions.Multiline);

            bool hasExperienceSection =
                sections.ContainsKey("experience") ||
                sections.ContainsKey("work experience") ||
                sections.ContainsKey("technical experience") ||
                sections.ContainsKey("professional experience") ||
                dbExperienceCount > 0 ||
                Regex.IsMatch(lower, @"(^|\n)\s*(technical|work|professional)?\s*experience\s*$",
                    RegexOptions.IgnoreCase | RegexOptions.Multiline);

            bool hasProjectsSection =
                sections.ContainsKey("projects") ||
                sections.ContainsKey("portfolio") ||
                dbProjectCount > 0 ||
                Regex.IsMatch(lower, @"(^|\n)\s*(projects|portfolio)\s*$",
                    RegexOptions.IgnoreCase | RegexOptions.Multiline);

            bool hasSummarySection =
                sections.ContainsKey("summary") ||
                sections.ContainsKey("professional summary") ||
                sections.ContainsKey("objective") ||
                sections.ContainsKey("profile");

            bool hasCertSection =
                sections.ContainsKey("certifications") ||
                sections.ContainsKey("certification") ||
                sections.ContainsKey("courses") ||
                Regex.IsMatch(lower, @"(^|\n)\s*certifications?\s*$", RegexOptions.IgnoreCase | RegexOptions.Multiline) ||
                Regex.IsMatch(rawLower, @"certifications?", RegexOptions.IgnoreCase);

            bool hasAwardsSection =
                sections.ContainsKey("awards") ||
                sections.ContainsKey("honors") ||
                sections.ContainsKey("honours");

            bool sectionsInGoodOrder = CheckSectionOrder(lower);

            int estimatedPages = EstimatePages(cvText);
            bool isOnePage = estimatedPages <= 1;

            bool hasEmail = HasEmail(rawCvText) || HasEmail(cvText);

            bool hasUsableLinkedIn =
                Regex.IsMatch(rawLowerNoSpaces, @"linkedin\.com/in/[a-z0-9\-_%.]+", RegexOptions.IgnoreCase) ||
                Regex.IsMatch(normalizedLowerNoSpaces, @"linkedin\.com/in/[a-z0-9\-_%.]+", RegexOptions.IgnoreCase);

            bool hasLinkedInDomainOnly = !hasUsableLinkedIn &&
                (Regex.IsMatch(rawLowerNoSpaces, @"linkedin\.com/in/?", RegexOptions.IgnoreCase) ||
                 Regex.IsMatch(normalizedLowerNoSpaces, @"linkedin\.com/in/?", RegexOptions.IgnoreCase));

            bool hasUsableGithub =
                Regex.IsMatch(rawLowerNoSpaces, @"github\.com/[a-z0-9\-_.]+", RegexOptions.IgnoreCase) ||
                Regex.IsMatch(normalizedLowerNoSpaces, @"github\.com/[a-z0-9\-_.]+", RegexOptions.IgnoreCase);

            bool hasGithubDomainOnly = !hasUsableGithub &&
                (Regex.IsMatch(rawLowerNoSpaces, @"github\.com/?", RegexOptions.IgnoreCase) ||
                 Regex.IsMatch(normalizedLowerNoSpaces, @"github\.com/?", RegexOptions.IgnoreCase));

            bool hasPortfolioSite = Regex.IsMatch(
                lower,
                @"\b(?:https?://)?(?:www\.)?(?!github\.com)(?!linkedin\.com)([a-z0-9-]+\.)+[a-z]{2,}\b",
                RegexOptions.IgnoreCase);

            string experienceText = CombineSections(sections,
                "experience", "work experience", "technical experience", "professional experience");

            string projectsText = CombineSections(sections,
                "projects", "portfolio");

            string measuredArea = string.Join("\n",
                new[]
                {
                    experienceText,
                    projectsText,
                    rawCvText,
                    cvText
                }
                .Where(x => !string.IsNullOrWhiteSpace(x))
            );

            int bulletCount = CountBullets(cvText);
            bool goodBulletDensity = bulletCount >= MinBullets && bulletCount <= MaxBullets;

            int actionVerbHits = CountActionVerbStarts(measuredArea);
            bool usesActionVerbs = actionVerbHits >= 2;

            bool hasFillerLanguage = FillerWords.Any(f =>
                lower.Contains(f, StringComparison.OrdinalIgnoreCase));

            bool hasMeasurableResults = HasMeasurableAchievements(measuredArea);

            bool hasDates = HasDates(cvText);

            bool hasSpellingIssues = CommonMisspellings.Any(w => lower.Contains(w));

            int detectedProjectCount = Math.Max(
                dbProjectCount,
                DetectProjectCount(projectsText, cvText, rawCvText, hasProjectsSection));

            var suggestedSkills = GetSuggestedSkillsByTrack(track);

            var missingSkills = suggestedSkills
                .Where(s =>
                    !dbSkillNames.Any(x => x.Equals(s, StringComparison.OrdinalIgnoreCase)) &&
                    !Regex.IsMatch(lower, $@"\b{Regex.Escape(s.ToLowerInvariant())}\b", RegexOptions.IgnoreCase))
                .ToList();

            return new CvAnalysis
            {
                HasSkillsSection = hasSkillsSection,
                HasEducationSection = hasEducationSection,
                HasExperienceSection = hasExperienceSection,
                HasProjectsSection = hasProjectsSection,
                HasSummarySection = hasSummarySection,
                HasCertSection = hasCertSection,
                HasAwardsSection = hasAwardsSection,
                SectionsInGoodOrder = sectionsInGoodOrder,

                EstimatedPages = estimatedPages,
                IsOnePage = isOnePage,

                HasEmail = hasEmail,
                HasLinkedIn = hasUsableLinkedIn,
                HasLinkedInDomainOnly = hasLinkedInDomainOnly,
                HasGithubLinks = hasUsableGithub,
                HasGithubDomainOnly = hasGithubDomainOnly,
                HasPortfolioSite = hasPortfolioSite,

                UsesActionVerbs = usesActionVerbs,
                ActionVerbHits = actionVerbHits,
                HasMeasurableAchievements = hasMeasurableResults,
                HasFillerLanguage = hasFillerLanguage,

                BulletCount = bulletCount,
                GoodBulletDensity = goodBulletDensity,

                HasDates = hasDates,
                HasSpellingIssues = hasSpellingIssues,

                MissingSkills = missingSkills,
                DetectedProjectCount = detectedProjectCount
            };
        }

        private static int ComputeScore(CvAnalysis a, int projectCount, List<string> skills, ResumeTrack track)
        {
            int score = 0;

            if (a.IsOnePage) score += 10;
            else if (a.EstimatedPages == 2) score += 5;
            else score += 2;

            if (a.GoodBulletDensity) score += 5;
            else if (a.BulletCount >= 2) score += 2;

            if (a.HasEmail) score += 4;
            if (a.HasLinkedIn) score += 4;
            else if (a.HasLinkedInDomainOnly) score += 1;
            if (a.HasGithubLinks) score += 4;
            else if (a.HasGithubDomainOnly) score += 1;

            if (a.HasSummarySection) score += 3;
            if (a.HasSkillsSection) score += 5;
            if (a.HasEducationSection) score += 4;
            if (a.HasExperienceSection) score += 6;
            if (a.HasProjectsSection) score += 4;

            if (a.UsesActionVerbs) score += 8;
            else if (a.ActionVerbHits >= 1) score += 4;

            if (a.HasMeasurableAchievements) score += 10;
            else score += 4;

            if (!a.HasFillerLanguage) score += 4;
            if (a.HasDates) score += 4;
            if (!a.HasSpellingIssues) score += 2;

            score += Math.Min(projectCount * 3, 9);

            if (skills.Count >= 10) score += 2;
            else if (skills.Count >= 6) score += 1;

            var suggestedSkills = GetSuggestedSkillsByTrack(track);

            int suggestedSkillsPresent = suggestedSkills.Count(s =>
                skills.Any(x => x.Equals(s, StringComparison.OrdinalIgnoreCase)));

            score += Math.Min(suggestedSkillsPresent, 5);

            if (a.HasCertSection) score += 1;
            if (a.SectionsInGoodOrder) score += 1;
            if (a.HasPortfolioSite) score += 1;

            if (!a.IsOnePage && a.EstimatedPages > 2) score -= 8;
            if (a.HasSpellingIssues) score -= 5;
            if (!a.HasExperienceSection) score -= 8;
            if (a.HasFillerLanguage) score -= 4;
            if (!a.HasEmail) score -= 6;
            if (!a.HasSkillsSection) score -= 6;
            if (!a.HasEducationSection) score -= 5;

            return Math.Max(0, Math.Min(100, score));
        }

        private static (List<string> Strengths, List<string> Warnings, List<string> Suggestions)
            BuildFeedback(CvAnalysis a, List<string> skills, int projectCount, int experienceCount, ResumeTrack track)
        {
            var strengths = new List<string>();
            var warnings = new List<string>();
            var suggestions = new List<string>();

            if (a.IsOnePage)
                strengths.Add("CV fits on one page — ideal for student and early-career applications.");
            else if (a.EstimatedPages == 2)
                warnings.Add("CV is around 2 pages. For early-career roles, a one-page version is usually stronger.");
            else
                warnings.Add($"CV is approximately {a.EstimatedPages} pages — too long for most junior applications.");

            if (a.GoodBulletDensity)
                strengths.Add($"Good bullet usage ({a.BulletCount} bullets) — easy to scan.");
            else if (a.BulletCount < MinBullets)
                suggestions.Add("Use more bullet points in experience and projects. Dense paragraphs are harder to skim.");
            else
                warnings.Add($"There are many bullets ({a.BulletCount}). Keep only the strongest, most impact-focused ones.");

            if (a.HasEmail)
                strengths.Add("Email detected in the CV header.");
            else
                warnings.Add("No email address detected — add one immediately.");

            if (a.HasLinkedIn)
                strengths.Add("LinkedIn profile URL detected.");
            else if (a.HasLinkedInDomainOnly)
                warnings.Add("LinkedIn looks incomplete. Use a full profile URL, not just linkedin.com/in/.");
            else
                suggestions.Add("Add a LinkedIn profile URL to the header.");

            if (a.HasGithubLinks)
                strengths.Add("GitHub URL detected.");
            else if (a.HasGithubDomainOnly)
                warnings.Add("GitHub looks incomplete. Use a full GitHub URL, not just github.com/.");
            else if (track == ResumeTrack.Software)
                suggestions.Add("Add your GitHub URL. For software roles, it helps a lot.");

            if (a.HasPortfolioSite)
                strengths.Add("Portfolio/personal website detected.");

            if (a.HasSummarySection)
                strengths.Add("Professional summary present.");
            else
                suggestions.Add(track == ResumeTrack.Software
                ? "Add a 2–3 line summary at the top tailored to software internships or junior roles."
                : "Add a 2–3 line summary at the top tailored to your target role or internship.");

            if (a.HasSkillsSection)
                strengths.Add("Skills section present.");
            else
                warnings.Add("Skills section missing — ATS parsing becomes much weaker without it.");

            if (a.HasEducationSection)
                strengths.Add("Education section present.");
            else
                warnings.Add("Education section missing.");

            if (a.HasExperienceSection)
                strengths.Add("Experience section present.");
            else
                warnings.Add("Experience section is missing or too weak.");

            if (a.HasProjectsSection)
                strengths.Add(track == ResumeTrack.Software
                    ? "Projects section present — important for software roles."
                    : "Projects section present.");
            else
                suggestions.Add(track == ResumeTrack.Software
                    ? "Add a Projects section with 2–3 strong technical or academic projects."
                    : "Add a Projects or Activities section with relevant academic, volunteer, research, or practical work.");

            if (!a.SectionsInGoodOrder)
                suggestions.Add("Use a cleaner order like Summary → Experience → Education → Projects → Skills.");

            if (a.HasCertSection)
                strengths.Add("Certifications or courses section detected.");
            else
                suggestions.Add("Consider adding relevant certifications or technical courses if they strengthen your profile.");

            if (a.UsesActionVerbs)
                strengths.Add($"Strong action-verb usage detected ({a.ActionVerbHits} bullet starts).");
            else if (a.ActionVerbHits >= 1)
                warnings.Add("Some action verbs exist, but more bullets should start with verbs like Built, Developed, Implemented, or Led.");
            else
                warnings.Add("No strong action-verb bullet starts detected. Rewrite bullets to sound achievement-focused.");

            if (a.HasMeasurableAchievements)
                strengths.Add("Quantified achievements detected — numbers strengthen credibility.");
            else
                warnings.Add("Very little measurable impact detected. Add results like percentages, counts, users, requests, or time saved.");

            if (a.HasFillerLanguage)
                warnings.Add("Weak filler phrases detected such as 'responsible for' or 'worked on'. Replace them with direct achievement bullets.");

            if (!a.HasDates)
                suggestions.Add("Add clear dates to all education and experience entries (Month YYYY – Month YYYY).");

            if (a.HasSpellingIssues)
                warnings.Add("Possible spelling issues detected. Run a spell-check before sending the CV.");

            if (skills.Count >= 8)
                strengths.Add(track == ResumeTrack.Software
                    ? $"{skills.Count} skills listed — solid technical coverage."
                    : $"{skills.Count} skills listed — good skills coverage.");
            else if (skills.Count > 0)
                suggestions.Add(track == ResumeTrack.Software
                    ? $"Only {skills.Count} skills detected. Expand to 8–15 relevant technologies."
                    : $"Only {skills.Count} skills detected. Add more role-relevant skills, tools, and strengths.");
            else
                warnings.Add(track == ResumeTrack.Software
                    ? "No skills detected from the profile. Add or sync technical skills."
                    : "No skills detected from the profile. Add or sync relevant skills.");

            if (a.MissingSkills.Any())
                suggestions.Add("Common skills you may want to include if you know them: " + string.Join(", ", a.MissingSkills) + ".");

            if (projectCount >= 3)
                strengths.Add($"{projectCount} projects detected — strong evidence of practical experience.");
            else if (projectCount >= 1)
                suggestions.Add(track == ResumeTrack.Software
                    ? $"{projectCount} project(s) detected. Aim for at least 3 strong projects with stack and impact."
                    : $"{projectCount} project(s) detected. Add more relevant projects, activities, research, or applied work if available.");
            else
                warnings.Add(track == ResumeTrack.Software
                    ? "No projects detected. Projects are extremely important for software internships."
                    : "No projects or relevant activities detected. Add academic work, volunteering, research, leadership, or practical experience if available.");

            if (experienceCount == 0)
                suggestions.Add("Add internships, research, leadership, or technical volunteering to strengthen experience.");

            return (strengths, warnings, suggestions);
        }

        private async Task<string> LoadCvTextAsync(string? cvFileName)
        {
            if (string.IsNullOrWhiteSpace(cvFileName))
                return string.Empty;

            var webRoot = _env.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRoot))
                webRoot = Path.Combine(_env.ContentRootPath, "wwwroot");

            var fullPath = Path.Combine(webRoot, "uploads", "resumes", cvFileName);

            if (!File.Exists(fullPath))
                return string.Empty;

            var ext = Path.GetExtension(fullPath).ToLowerInvariant();

            if (ext == ".txt")
                return await File.ReadAllTextAsync(fullPath);

            if (ext == ".pdf")
            {
                using var reader = new PdfReader(fullPath);
                using var pdf = new PdfDocument(reader);

                var sb = new StringBuilder();

                for (int i = 1; i <= pdf.GetNumberOfPages(); i++)
                {
                    var page = pdf.GetPage(i);
                    var text = PdfTextExtractor.GetTextFromPage(page);
                    if (!string.IsNullOrWhiteSpace(text))
                        sb.AppendLine(text);
                }

                return sb.ToString();
            }

            return string.Empty;
        }

        private static string NormalizeCvText(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return string.Empty;

            text = text.Replace("\r\n", "\n").Replace("\r", "\n");

            text = text.Replace("●", "•")
                       .Replace("▪", "•")
                       .Replace("◦", "•")
                       .Replace("·", "•")
                       .Replace("\t", " ");

            text = Regex.Replace(
                text,
                @"(?<!\n)(EDUCATION|TECHNICAL SKILLS|SKILLS|PROJECTS|PORTFOLIO|TECHNICAL EXPERIENCE|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EXPERIENCE|CERTIFICATIONS|CERTIFICATION|EXTRACURRICULAR ACTIVITIES|SUMMARY|PROFESSIONAL SUMMARY|OBJECTIVE|PROFILE|AWARDS|HONORS)",
                "\n$1",
                RegexOptions.IgnoreCase);

            text = Regex.Replace(text, @"[ ]{2,}", " ");
            text = Regex.Replace(text, @"\n{3,}", "\n\n");

            return text.Trim();
        }

        private static Dictionary<string, string> ExtractSections(string cvText)
        {
            var lines = cvText
                .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(l => l.Trim())
                .Where(l => !string.IsNullOrWhiteSpace(l))
                .ToList();

            var sections = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            string? currentSection = null;
            var currentContent = new List<string>();

            bool IsHeader(string line, out string normalizedHeader)
            {
                var t = line.Trim().Trim(':').ToLowerInvariant();

                var headers = new[]
                {
                    "summary", "professional summary", "objective", "profile",
                    "education",
                    "experience", "work experience", "technical experience", "professional experience",
                    "projects", "portfolio",
                    "skills", "technical skills",
                    "certifications", "certification", "courses",
                    "awards", "honors", "honours",
                    "extracurricular activities", "extracurricular"
                };

                normalizedHeader = headers.FirstOrDefault(h =>
                    t.Equals(h, StringComparison.OrdinalIgnoreCase)) ?? string.Empty;

                return !string.IsNullOrWhiteSpace(normalizedHeader);
            }

            void Flush()
            {
                if (!string.IsNullOrWhiteSpace(currentSection))
                    sections[currentSection] = string.Join("\n", currentContent).Trim();
            }

            foreach (var line in lines)
            {
                if (IsHeader(line, out var header))
                {
                    Flush();
                    currentSection = header;
                    currentContent = new List<string>();
                    continue;
                }

                if (currentSection != null)
                    currentContent.Add(line);
            }

            Flush();
            return sections;
        }

        private static string CombineSections(Dictionary<string, string> sections, params string[] names)
        {
            var parts = names
                .Where(n => sections.ContainsKey(n))
                .Select(n => sections[n])
                .Where(v => !string.IsNullOrWhiteSpace(v));

            return string.Join("\n", parts);
        }

        private static IEnumerable<string> SplitIntoBulletLines(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                yield break;

            var normalized = text
                .Replace("\r\n", "\n")
                .Replace("\r", "\n")
                .Replace("●", "•")
                .Replace("▪", "•")
                .Replace("◦", "•")
                .Replace("·", "•");

            var parts = normalized
                .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(x => Regex.Replace(x.Trim(), @"^(•|-|\*|\d+\.)\s*", ""))
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToList();

            if (parts.Count > 1)
            {
                foreach (var part in parts)
                    yield return part;

                yield break;
            }

            foreach (var chunk in Regex.Split(normalized, @"\s*[•;]\s*")
                         .Select(x => Regex.Replace(x.Trim(), @"^(•|-|\*|\d+\.)\s*", ""))
                         .Where(x => !string.IsNullOrWhiteSpace(x)))
            {
                yield return chunk;
            }
        }

        private static bool HasEmail(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return false;

            var compact = Regex.Replace(text, @"\s+", "");

            return Regex.IsMatch(
                compact,
                @"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
                RegexOptions.IgnoreCase);
        }

        private static bool HasDates(string text)
        {
            return Regex.IsMatch(
                text,
                @"\b(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\s+\d{4}\b|\bExpected\s+\d{4}\b|\b(19|20)\d{2}\b",
                RegexOptions.IgnoreCase);
        }

        private static int EstimatePages(string cvText)
        {
            if (string.IsNullOrWhiteSpace(cvText))
                return 1;

            int charsEstimate = (int)Math.Ceiling((double)cvText.Length / CharsPerPage);
            int lines = cvText.Split('\n', StringSplitOptions.RemoveEmptyEntries).Length;
            int linesEstimate = lines <= 60 ? 1 : lines <= 100 ? 2 : 3;

            return Math.Max(1, Math.Max(charsEstimate, linesEstimate));
        }

        private static int CountBullets(string cvText)
        {
            var lines = cvText
                .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(l => l.Trim())
                .Where(l => !string.IsNullOrWhiteSpace(l))
                .ToList();

            int explicitBullets = lines.Count(line =>
                line.StartsWith("•") ||
                line.StartsWith("-") ||
                line.StartsWith("*") ||
                Regex.IsMatch(line, @"^\d+\.\s"));

            if (explicitBullets > 0)
                return explicitBullets;

            int inferredBullets = lines.Count(line =>
                Regex.IsMatch(line, @"^(built|developed|implemented|designed|created|led|improved|optimized|managed|analyzed|architected|delivered|launched|reduced|increased|automated|refactored|integrated|deployed|collaborated|mentored|researched|resolved|migrated|scaled|organized|evaluated|engineered|maintained|supported|tested)\b",
                    RegexOptions.IgnoreCase));

            return inferredBullets;
        }

        private static int CountActionVerbStarts(string text)
        {
            int count = 0;

            var lines = text
                .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim())
                .Where(x => !string.IsNullOrWhiteSpace(x));

            foreach (var raw in lines)
            {
                var line = Regex.Replace(raw, @"^(•|-|\*|\d+\.)\s*", "");
                var firstWord = Regex.Match(line, @"^[A-Za-z]+");
                if (!firstWord.Success) continue;

                if (ActionVerbs.Any(v => v.Equals(firstWord.Value, StringComparison.OrdinalIgnoreCase)))
                    count++;
            }

            return count;
        }

        private static bool HasMeasurableAchievements(string text)
        {
            var lines = text
                .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(l => l.Trim())
                .Where(l => !string.IsNullOrWhiteSpace(l));

            foreach (var line in lines)
            {
                var lower = line.ToLowerInvariant();

                bool hasPercent = lower.Contains('%');
                bool hasPlusCount = Regex.IsMatch(lower, @"\b\d+\+");
                bool hasLargeNumber = Regex.IsMatch(lower, @"\b\d{2,}(?:,\d{3})*\b");
                bool hasRank = Regex.IsMatch(lower, @"#\d+|\btop\s+\d+\b");
                bool hasImpactWord = Regex.IsMatch(
                    lower,
                    @"\b(increased|reduced|improved|boosted|grew|saved|cut|served|supported|managed|ranked|reached|mentored)\b");

                bool looksLikeDateOnly = Regex.IsMatch(
                    lower,
                    @"^(?:[a-z]+\s+)?\d{4}\s*(?:-|–|to)\s*(?:present|(?:[a-z]+\s+)?\d{4})$",
                    RegexOptions.IgnoreCase);

                if (!looksLikeDateOnly &&
                    (hasPercent || hasPlusCount || hasRank || (hasLargeNumber && hasImpactWord)))
                {
                    return true;
                }
            }

            return false;
        }

        private static int DetectProjectCount(
            string projectsSectionText,
            string fullText,
            string rawFullText,
            bool hasProjectsSection)
        {
            if (!hasProjectsSection)
                return 0;

            var source = !string.IsNullOrWhiteSpace(projectsSectionText)
                ? projectsSectionText
                : !string.IsNullOrWhiteSpace(fullText)
                    ? fullText
                    : rawFullText;

            if (string.IsNullOrWhiteSpace(source))
                return 0;

            var lines = source
                .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(l => l.Trim())
                .Where(l => !string.IsNullOrWhiteSpace(l))
                .ToList();

            int count = 0;

            foreach (var line in lines)
            {
                bool looksLikeProjectTitle =
                    line.Length <= 100 &&
                    !line.StartsWith("•") &&
                    !line.StartsWith("-") &&
                    !line.StartsWith("*") &&
                    !Regex.IsMatch(line, @"^(built|developed|designed|created|implemented|organized|worked|responsible)\b",
                        RegexOptions.IgnoreCase) &&
                    (
                        Regex.IsMatch(line, @"\([^)]+\)") ||
                        Regex.IsMatch(line, @"^[A-Z0-9][A-Za-z0-9&+./\- ]{2,}$")
                    );

                if (looksLikeProjectTitle)
                    count++;
            }

            return Math.Min(count, 12);
        }

        private static bool CheckSectionOrder(string lower)
        {
            int summaryIdx = IndexOfAny(lower, "summary", "professional summary", "objective", "profile");
            int experienceIdx = IndexOfAny(lower, "technical experience", "professional experience", "work experience", "experience");
            int educationIdx = IndexOfAny(lower, "education");
            int projectsIdx = IndexOfAny(lower, "projects", "portfolio");
            int skillsIdx = IndexOfAny(lower, "skills", "technical skills");

            var ordered = new List<int>();
            if (summaryIdx >= 0) ordered.Add(summaryIdx);
            if (experienceIdx >= 0) ordered.Add(experienceIdx);
            if (educationIdx >= 0) ordered.Add(educationIdx);
            if (projectsIdx >= 0) ordered.Add(projectsIdx);
            if (skillsIdx >= 0) ordered.Add(skillsIdx);

            if (ordered.Count < 3) return true;

            for (int i = 1; i < ordered.Count; i++)
            {
                if (ordered[i] < ordered[i - 1])
                    return false;
            }

            return true;
        }

        private static int IndexOfAny(string text, params string[] keywords)
        {
            return keywords
                .Select(k => text.IndexOf(k, StringComparison.OrdinalIgnoreCase))
                .Where(i => i >= 0)
                .DefaultIfEmpty(-1)
                .Min();
        }

        private sealed class CvAnalysis
        {
            public bool HasSkillsSection { get; init; }
            public bool HasEducationSection { get; init; }
            public bool HasExperienceSection { get; init; }
            public bool HasProjectsSection { get; init; }
            public bool HasSummarySection { get; init; }
            public bool HasCertSection { get; init; }
            public bool HasAwardsSection { get; init; }
            public bool SectionsInGoodOrder { get; init; }

            public int EstimatedPages { get; init; }
            public bool IsOnePage { get; init; }

            public bool HasEmail { get; init; }

            public bool HasLinkedIn { get; init; }
            public bool HasLinkedInDomainOnly { get; init; }
            public bool HasGithubLinks { get; init; }
            public bool HasGithubDomainOnly { get; init; }
            public bool HasPortfolioSite { get; init; }

            public bool UsesActionVerbs { get; init; }
            public int ActionVerbHits { get; init; }
            public bool HasMeasurableAchievements { get; init; }
            public bool HasFillerLanguage { get; init; }

            public int BulletCount { get; init; }
            public bool GoodBulletDensity { get; init; }

            public bool HasDates { get; init; }
            public bool HasSpellingIssues { get; init; }

            public List<string> MissingSkills { get; init; } = new();
            public int DetectedProjectCount { get; init; }
        }
    }
}
