import { useNavigate } from "react-router-dom";
import {
    MapPin,
    Building2,
    Bookmark,
    ChevronDown,
    Calendar,
    Clock,
    Video,
    ArrowRight,
    FileText,
    CheckSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../api/api";
import "../../styles/matches.css";

function getInitials(company = "") {
    return company.slice(0, 2).toUpperCase();
}

function scoreColor(score) {
    if (score >= 70) return "green";
    if (score >= 50) return "blue";
    return "yellow";
}

function statusClass(status) {
    switch (status) {
        case "Draft":
            return "status-pill draft";
        case "Pending":
            return "status-pill applied";
        case "In Review":
            return "status-pill review";
        case "Shortlisted":
            return "status-pill shortlisted";
        case "Accepted":
            return "status-pill offer";
        case "Rejected":
            return "status-pill rejected";
        default:
            return "status-pill";
    }
}

function stepInfo(status) {
    switch (status) {
        case "Draft":
            return { step: "Stage 1", filled: 1 };

        case "Pending":
            return { step: "Stage 2", filled: 2 };

        case "In Review":
            return { step: "Stage 3", filled: 3 };

        case "Shortlisted":
            return { step: "Stage 4", filled: 4 };

        case "Accepted":
        case "Rejected":
            return { step: "Stage 5", filled: 5 };

        default:
            return { step: "Stage 1", filled: 1 };
    }
}

function Steps({ status }) {
    const { step, filled } = stepInfo(status);

    return (
        <div className="app-steps">
            <div className="app-dots">
                {[1, 2, 3, 4, 5].map((n) => (
                    <span
                        key={n}
                        className={`app-dot ${n <= filled ? "filled" : ""}`}
                    />
                ))}
            </div>
            <span className="app-step-text">{step}</span>
        </div>
    );
}

export function OpportunityCard({ match }) {
    const [expanded, setExpanded] = useState(false);
    const navigate = useNavigate();

    return (
        <div className={`match-card opportunity-card ${expanded ? "expanded" : ""}`}>
            <div className="match-card-row">
                <div className="match-card-left">
                    <div className={`match-logo ${match.logoColor || "blue"}`}>
                        {getInitials(match.company)}
                    </div>

                    <div className="match-main">
                        <h3 className="match-job-title">{match.jobTitle}</h3>

                        <div className="match-meta">
                            <span className="match-company">
                                <Building2 size={15} />
                                {match.company}
                            </span>

                            <span className="match-dot">•</span>

                            <span className="match-company">
                                <MapPin size={15} />
                                {match.location}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="match-card-right">
                    <div className="match-score-wrap">
                        <div className={`match-score-circle ${scoreColor(match.matchPercentage)}`}>
                            {match.matchPercentage}%
                        </div>
                        <div className="match-score-label">MATCH</div>
                    </div>

                    <div className="match-actions">
                        <button
                            type="button"
                            className="match-btn"
                            onClick={() => setExpanded((v) => !v)}
                        >
                            {expanded ? "Hide Details" : "View Match"}
                            <ChevronDown size={16} style={{ marginLeft: 6 }} />
                        </button>

                        <button type="button" className="match-btn-icon">
                            <Bookmark size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {expanded && (
                <div className="match-expanded">
                    <div className="match-analysis-header">
                        <div className="match-analysis-title">⚡ MATCH ANALYSIS</div>
                        <button
                            type="button"
                            className="job-link-btn"
                            onClick={() => navigate(`/opportunities/${match.id}`)}
                        >
                            See Full Job Description ↗
                        </button>
                    </div>

                    <div className="skill-box">
                        <h4 className="skill-box-title">Skill Transparency</h4>

                        <div className="skill-columns">
                            <div>
                                <div className="skill-subtitle matched">Matched</div>
                                <div className="skill-list">
                                    {(match.skills || [])
                                        .filter((s) => s.matched)
                                        .map((skill) => (
                                            <div key={skill.name} className="skill-row good">
                                                <span className="skill-icon">⊕</span>
                                                {skill.name}
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div>
                                <div className="skill-subtitle missing">Missing</div>
                                <div className="skill-list">
                                    {(match.skills || [])
                                        .filter((s) => !s.matched)
                                        .map((skill) => (
                                            <div key={skill.name} className="skill-row bad">
                                                <span className="skill-icon">⊗</span>
                                                {skill.name}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function OpportunitiesTab({ matches = [] }) {
    const opportunities = matches.filter((m) => m.type === "opportunity");

    if (!opportunities.length) {
        return <div className="matches-empty">No new opportunities found.</div>;
    }

    return (
        <div className="matches-content">
            {opportunities.map((match) => (
                <OpportunityCard key={match.id} match={match} />
            ))}
        </div>
    );
}

export function ApplicationsTab({ matches = [] }) {
    const applications = matches.filter((m) => m.type === "application");

    const navigate = useNavigate();

    if (!applications.length) {
        return <div className="matches-empty">No active applications.</div>;
    }

    return (
        <div className="matches-content">
            {applications.map((match) => (
                <div key={match.id} className="match-card app-card">
                    <div className="app-card-row">
                        <div className="app-left">
                            <div className={`match-logo ${match.logoColor || "blue"}`}>
                                {getInitials(match.company)}
                            </div>

                            <div className="match-main">
                                <h3 className="match-job-title">{match.jobTitle}</h3>

                                <div className="match-meta">
                                    <span className="match-company">
                                        <Building2 size={15} />
                                        {match.company}
                                    </span>

                                    <span className="match-dot">•</span>

                                    <span className={statusClass(match.status)}>
                                        {match.status}
                                    </span>
                                </div>

                                <div className="app-extra-left">
                                    <Steps status={match.status} />

                                    {match.status === "Draft" && (
                                        <div className="assessment-pill">
                                            <Clock size={14} />
                                            Assessment Available
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="app-right">
                            <button
                                className="arrow-btn"
                                onClick={() => navigate(`/apply/${match.id}/review`)}
                            >
                                →
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function InterviewsTab() {
    const navigate = useNavigate();

    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [prepareOpen, setPrepareOpen] = useState(false);
    const [selectedInterview, setSelectedInterview] = useState(null);

    useEffect(() => {
        async function loadInterviews() {
            try {
                setLoading(true);
                setError("");
                const res = await api.get("/interviews/my");
                setInterviews(res.data || []);
            } catch (err) {
                console.error("Failed to load interviews:", err);
                setError("Failed to load interviews.");
            } finally {
                setLoading(false);
            }
        }

        loadInterviews();
    }, []);

    function formatDate(dateStr) {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }

    function formatTime(dateStr) {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function getTimeLeft(dateStr) {
        if (!dateStr) return "";
        const now = new Date();
        const target = new Date(dateStr);
        const diffMs = target - now;

        if (diffMs <= 0) return "Starting soon";

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? "s" : ""} left`;
        }

        if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? "s" : ""} left`;
        }

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes} min left`;
    }

    function openPrepare(interview) {
        setSelectedInterview(interview);
        setPrepareOpen(true);
    }

    function closePrepare() {
        setPrepareOpen(false);
        setSelectedInterview(null);
    }

    if (loading) {
        return <div className="matches-empty">Loading interviews...</div>;
    }

    if (error) {
        return <div className="matches-empty">{error}</div>;
    }

    if (!interviews.length) {
        return <div className="matches-empty">No interviews scheduled yet.</div>;
    }

    return (
        <>
            <div className="interviews-grid">
                {interviews.map((item) => (
                    <div key={item.id} className="interview-card">
                        <div className="interview-accent" />

                        <div className="interview-top">
                            <div>
                                <div className="interview-badges">
                                    <span className="upcoming-pill">UPCOMING</span>
                                    <span className="time-left">• {getTimeLeft(item.scheduledAtUtc)}</span>
                                </div>

                                <h3 className="interview-title">{item.opportunityTitle}</h3>

                                <div className="match-meta">
                                    <span className="match-company">
                                        <Building2 size={15} />
                                        {item.companyName}
                                    </span>
                                </div>
                            </div>

                            <div className="match-logo indigo">
                                {getInitials(item.companyName)}
                            </div>
                        </div>

                        <div className="interview-info-grid">
                            <div className="interview-info-box">
                                <div className="interview-info-label">
                                    <Calendar size={14} />
                                    DATE
                                </div>
                                <div className="interview-info-value">
                                    {formatDate(item.scheduledAtUtc)}
                                </div>
                            </div>

                            <div className="interview-info-box">
                                <div className="interview-info-label">
                                    <Clock size={14} />
                                    TIME
                                </div>
                                <div className="interview-info-value">
                                    {formatTime(item.scheduledAtUtc)}
                                </div>
                            </div>

                            <div className="interview-info-box full">
                                <div className="interview-info-label">
                                    <Video size={14} />
                                    LOCATION
                                </div>
                                <div className="interview-info-value">
                                    {item.location || "Online"}
                                </div>
                            </div>
                        </div>

                        <div className="interview-actions">
                            <button
                                className="prepare-btn"
                                type="button"
                                onClick={() => openPrepare(item)}
                            >
                                Prepare
                            </button>

                            {item.meetingLink ? (
                                <a
                                    href={item.meetingLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="join-btn"
                                >
                                    Join Interview <ArrowRight size={16} />
                                </a>
                            ) : (
                                <button className="join-btn" type="button" disabled>
                                    No Link Yet <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {prepareOpen && selectedInterview && (
                <div className="prepare-modal-overlay" onClick={closePrepare}>
                    <div
                        className="prepare-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="prepare-modal-header">
                            <div>
                                <h2>Prepare for Interview</h2>
                                <p>Review everything before joining.</p>
                            </div>

                            <button
                                type="button"
                                className="prepare-close-btn"
                                onClick={closePrepare}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="prepare-modal-body">
                            <div className="prepare-section">
                                <h3>Interview Details</h3>

                                <div className="prepare-grid">
                                    <div className="prepare-box">
                                        <div className="prepare-label">Role</div>
                                        <div className="prepare-value">
                                            {selectedInterview.opportunityTitle}
                                        </div>
                                    </div>

                                    <div className="prepare-box">
                                        <div className="prepare-label">Company</div>
                                        <div className="prepare-value">
                                            {selectedInterview.companyName}
                                        </div>
                                    </div>

                                    <div className="prepare-box">
                                        <div className="prepare-label">Date</div>
                                        <div className="prepare-value">
                                            {formatDate(selectedInterview.scheduledAtUtc)}
                                        </div>
                                    </div>

                                    <div className="prepare-box">
                                        <div className="prepare-label">Time</div>
                                        <div className="prepare-value">
                                            {formatTime(selectedInterview.scheduledAtUtc)}
                                        </div>
                                    </div>

                                    <div className="prepare-box full">
                                        <div className="prepare-label">Location</div>
                                        <div className="prepare-value">
                                            {selectedInterview.location || "Online"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="prepare-section">
                                <h3>Checklist</h3>
                                <ul className="prepare-list">
                                    <li>Review your CV before the interview.</li>
                                    <li>Read the opportunity description again.</li>
                                    <li>Prepare 2–3 projects or experiences to talk about.</li>
                                    <li>Test your microphone, camera, and internet.</li>
                                    <li>Join 5–10 minutes early.</li>
                                </ul>
                            </div>

                            <div className="prepare-section">
                                <h3>Possible Questions</h3>
                                <ul className="prepare-list">
                                    <li>Tell us about yourself.</li>
                                    <li>Why are you interested in this role?</li>
                                    <li>What project are you most proud of?</li>
                                    <li>What skills make you a strong fit for this opportunity?</li>
                                    <li>How do you handle challenges in technical work?</li>
                                </ul>
                            </div>

                            <div className="prepare-section">
                                <h3>Quick Actions</h3>

                                <div className="prepare-actions-row">
                                    <button
                                        type="button"
                                        className="prepare-action-btn"
                                        onClick={() => navigate("/profile")}
                                    >
                                        Review CV
                                    </button>

                                    {selectedInterview.meetingLink ? (
                                        <a
                                            href={selectedInterview.meetingLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="prepare-action-btn primary"
                                        >
                                            Open Meeting Link
                                        </a>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export function CVReviewTab() {
    const navigate = useNavigate();

    return (
        <div className="match-card cv-card">
            <div className="match-card-row">
                <div className="match-card-left">
                    <div className="match-logo blue">
                        <FileText size={24} />
                    </div>

                    <div className="match-main">
                        <h3 className="match-job-title">CV Review</h3>
                        <div className="match-meta">
                            <span className="match-company">
                                <CheckSquare size={15} />
                                Your CV feedback and suggestions
                            </span>
                        </div>
                    </div>
                </div>

                <div className="match-actions">
                    <button
                        className="match-btn"
                        onClick={() => navigate("/profile")}
                        type="button"
                    >
                        Open Review
                    </button>
                </div>
            </div>
        </div>
    );
}
