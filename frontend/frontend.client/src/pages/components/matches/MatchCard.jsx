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
import { useState } from "react";

function getInitials(company = "") {
    return company.slice(0, 2).toUpperCase();
}

function scoreColor(score) {
    if (score >= 80) return "green";
    if (score >= 70) return "blue";
    return "yellow";
}

function statusClass(status) {
    switch (status) {
        case "Applied":
            return "status-pill applied";
        case "Under Review":
            return "status-pill review";
        case "Offer":
            return "status-pill offer";
        default:
            return "status-pill";
    }
}

function stepInfo(status) {
    switch (status) {
        case "Applied":
            return { step: "Step 1", filled: 1 };
        case "Assessment":
            return { step: "Step 2", filled: 2 };
        case "Under Review":
            return { step: "Step 3", filled: 3 };
        case "Interview":
            return { step: "Step 4", filled: 4 };
        case "Offer":
            return { step: "Step 5", filled: 5 };
        default:
            return { step: "Step 1", filled: 1 };
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
                        <button type="button" className="job-link-btn">
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
    const opportunities = matches.filter((m) => m.status === "Saved");

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
    const applications = matches.filter((m) =>
        ["Applied", "Assessment", "Under Review", "Offer", "Rejected"].includes(m.status)
    );

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
                                    <span className={statusClass(match.status)}>{match.status}</span>
                                </div>
                            </div>
                        </div>

                        <div className="app-middle">
                            <Steps status={match.status} />
                        </div>

                        <div className="app-right">
                            <div className="deadline-pill">
                                <Clock size={15} />
                                {match.deadline}
                            </div>
                            <button className="arrow-btn">→</button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function InterviewsTab({ matches = [] }) {
    const interviews = matches.filter((m) => m.status === "Interview");

    if (!interviews.length) {
        return <div className="matches-empty">No interviews scheduled yet.</div>;
    }

    return (
        <div className="interviews-grid">
            {interviews.map((match) => (
                <div key={match.id} className="interview-card">
                    <div className="interview-accent" />

                    <div className="interview-top">
                        <div>
                            <div className="interview-badges">
                                <span className="upcoming-pill">UPCOMING</span>
                                <span className="time-left">• {match.timeLeft}</span>
                            </div>

                            <h3 className="interview-title">{match.jobTitle}</h3>

                            <div className="match-meta">
                                <span className="match-company">
                                    <Building2 size={15} />
                                    {match.company}
                                </span>
                            </div>
                        </div>

                        <div className={`match-logo ${match.logoColor || "indigo"}`}>
                            {getInitials(match.company)}
                        </div>
                    </div>

                    <div className="interview-info-grid">
                        <div className="interview-info-box">
                            <div className="interview-info-label">
                                <Calendar size={14} />
                                DATE
                            </div>
                            <div className="interview-info-value">{match.interviewDate}</div>
                        </div>

                        <div className="interview-info-box">
                            <div className="interview-info-label">
                                <Clock size={14} />
                                TIME
                            </div>
                            <div className="interview-info-value">{match.interviewTime}</div>
                        </div>

                        <div className="interview-info-box full">
                            <div className="interview-info-label">
                                <Video size={14} />
                                LOCATION
                            </div>
                            <div className="interview-info-value">{match.interviewLocation}</div>
                        </div>
                    </div>

                    <div className="interview-actions">
                        <button className="prepare-btn">Prepare</button>
                        <a
                            href={match.interviewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="join-btn"
                        >
                            Join Interview <ArrowRight size={16} />
                        </a>
                    </div>
                </div>
            ))}
        </div>
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
