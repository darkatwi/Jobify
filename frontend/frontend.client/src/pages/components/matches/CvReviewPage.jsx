import { useEffect, useMemo, useState } from "react";
import {
    FileText,
    Sparkles,
    CircleCheck,
    TriangleAlert,
    Wrench,
    BadgeCheck,
    ListChecks,
    BarChart3,
} from "lucide-react";
import "../../styles/matches.css";
import { api } from "../../../api/api";

function ScoreTone(score) {
    if (score >= 80) return "excellent";
    if (score >= 65) return "good";
    if (score >= 50) return "fair";
    return "weak";
}

export default function CvReviewPage() {
    const [review, setReview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchReview() {
            try {
                setLoading(true);
                setError("");

                const res = await api.get("/cv/review");
                setReview(res.data);
            } catch (err) {
                console.error(err);
                setError(
                    err?.response?.status === 401
                        ? "You are not authorized. Please log in again."
                        : "Failed to load CV review."
                );
            } finally {
                setLoading(false);
            }
        }

        fetchReview();
    }, []);

    const score = review?.resumeScore ?? 0;
    const scoreTone = ScoreTone(score);

    const improvements = useMemo(
        () => [...(review?.warnings ?? []), ...(review?.suggestions ?? [])],
        [review]
    );

    const sectionChecks = [
        { label: "Skills", ok: review?.sectionChecks?.hasSkillsSection },
        { label: "Education", ok: review?.sectionChecks?.hasEducationSection },
        { label: "Experience", ok: review?.sectionChecks?.hasExperienceSection },
        { label: "Projects", ok: review?.sectionChecks?.hasProjectsSection },
    ];

    const qualityChecks = [
        { label: "Action Verbs", ok: review?.contentQuality?.usesActionVerbs },
        { label: "Measured Impact", ok: review?.contentQuality?.hasMeasurableAchievements },
        {
            label: `Bullets: ${review?.contentQuality?.bulletCount ?? 0}`,
            ok: (review?.contentQuality?.bulletCount ?? 0) > 0,
        },
    ];

    if (loading) {
        return (
            <div className="cv-review-page">
                <div className="cv-review-hero">
                    <div className="cv-review-hero-icon">
                        <FileText size={28} />
                    </div>
                    <div className="cv-review-hero-text">
                        <h1>CV Review</h1>
                        <p>Loading your resume feedback...</p>
                    </div>
                </div>

                <div className="cv-review-skeleton-grid">
                    <div className="cv-skeleton cv-skeleton-tall" />
                    <div className="cv-skeleton" />
                    <div className="cv-skeleton" />
                    <div className="cv-skeleton" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="cv-review-page">
                <div className="cv-review-empty">
                    <TriangleAlert size={22} />
                    <h2>CV Review</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="cv-review-page">
            <div className="cv-review-hero">
                <div className="cv-review-hero-icon">
                    <FileText size={30} />
                </div>

                <div className="cv-review-hero-text">
                    <h1>CV Review</h1>
                    <p>Your AI feedback and resume suggestions.</p>
                </div>
            </div>

            <div className="cv-review-top-grid">
                <div className={`cv-review-card cv-review-score-card ${scoreTone}`}>
                    <div className="cv-review-card-header">
                        <div className="cv-review-card-title">
                            <Sparkles size={18} />
                            <span>Resume Score</span>
                        </div>
                        <span className={`cv-score-badge ${scoreTone}`}>
                            {score >= 80 ? "Strong" : score >= 65 ? "Good" : score >= 50 ? "Needs work" : "Weak"}
                        </span>
                    </div>

                    <div className="cv-review-score-row">
                        <div className="cv-review-score">
                            {score}
                            <span>/100</span>
                        </div>

                        <div className="cv-review-score-copy">
                            <h3>
                                {score >= 80
                                    ? "Strong foundation"
                                    : score >= 65
                                        ? "Solid, but improvable"
                                        : score >= 50
                                            ? "Decent start"
                                            : "Needs major polish"}
                            </h3>
                            <p>
                                Focus on the missing signals below to improve how your CV reads
                                for recruiters and ATS tools.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="cv-review-card">
                    <div className="cv-review-card-header">
                        <div className="cv-review-card-title">
                            <BadgeCheck size={18} />
                            <span>Section Checks</span>
                        </div>
                    </div>

                    <div className="cv-chip-grid">
                        {sectionChecks.map((item) => (
                            <div key={item.label} className={`cv-chip ${item.ok ? "ok" : "bad"}`}>
                                <span className="cv-chip-dot" />
                                {item.label}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="cv-review-card">
                    <div className="cv-review-card-header">
                        <div className="cv-review-card-title">
                            <BarChart3 size={18} />
                            <span>Content Quality</span>
                        </div>
                    </div>

                    <div className="cv-chip-grid">
                        {qualityChecks.map((item) => (
                            <div key={item.label} className={`cv-chip ${item.ok ? "ok" : "bad"}`}>
                                <span className="cv-chip-dot" />
                                {item.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="cv-review-main-grid">
                <div className="cv-review-card">
                    <div className="cv-review-card-header">
                        <div className="cv-review-card-title">
                            <CircleCheck size={18} />
                            <span>Strengths</span>
                        </div>
                        <span className="cv-count-pill">{review?.strengths?.length ?? 0}</span>
                    </div>

                    <ul className="cv-review-list">
                        {(review?.strengths ?? []).map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div className="cv-review-card">
                    <div className="cv-review-card-header">
                        <div className="cv-review-card-title">
                            <TriangleAlert size={18} />
                            <span>Warnings</span>
                        </div>
                        <span className="cv-count-pill">{review?.warnings?.length ?? 0}</span>
                    </div>

                    <ul className="cv-review-list warning">
                        {(review?.warnings ?? []).map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div className="cv-review-card">
                    <div className="cv-review-card-header">
                        <div className="cv-review-card-title">
                            <Wrench size={18} />
                            <span>Suggestions</span>
                        </div>
                        <span className="cv-count-pill">{review?.suggestions?.length ?? 0}</span>
                    </div>

                    <ul className="cv-review-list suggestion">
                        {(review?.suggestions ?? []).map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div className="cv-review-card">
                    <div className="cv-review-card-header">
                        <div className="cv-review-card-title">
                            <ListChecks size={18} />
                            <span>Detected Skills</span>
                        </div>
                        <span className="cv-count-pill">{review?.skillsCoverage?.detectedSkills?.length ?? 0}</span>
                    </div>

                    <div className="cv-skills-wrap">
                        {(review?.skillsCoverage?.detectedSkills ?? []).map((skill, index) => (
                            <span key={`${skill}-${index}`} className="cv-skill-tag">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {improvements.length === 0 && (
                <div className="cv-review-empty small">
                    <CircleCheck size={20} />
                    <p>No major issues detected.</p>
                </div>
            )}
        </div>
    );
}
