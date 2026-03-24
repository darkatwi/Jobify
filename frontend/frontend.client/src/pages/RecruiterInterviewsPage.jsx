import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Link as LinkIcon, User2 } from "lucide-react";
import { api } from "../api/api";
import "./styles/recruiter.css";

function formatInterviewDate(value) {
    return new Date(value).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatInterviewTime(value) {
    return new Date(value).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
    });
}

export default function RecruiterInterviewsPage() {
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/interviews/recruiter")
            .then((res) => setInterviews(Array.isArray(res.data) ? res.data : []))
            .catch(() => setInterviews([]))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="recruiter-interviews-page">
                <div className="recruiter-interviews-loading">Loading interviews...</div>
            </div>
        );
    }

    return (
        <div className="recruiter-interviews-page">
            <div className="recruiter-interviews-header">
                <h1 className="recruiter-interviews-title">Recruiter Interviews</h1>
                <p className="recruiter-interviews-subtitle">
                    Review and manage your scheduled candidate interviews.
                </p>
            </div>

            {interviews.length === 0 ? (
                <div className="recruiter-interviews-empty">
                    No interviews scheduled yet.
                </div>
            ) : (
                <div className="recruiter-interviews-grid">
                    {interviews.map((i) => (
                        <div key={i.id} className="recruiter-interview-card">
                            <div className="recruiter-interview-card-top">
                                <h2 className="recruiter-interview-title-card">
                                    {i.opportunityTitle}
                                </h2>

                                <div className="recruiter-interview-date-badge">
                                    <CalendarDays size={14} />
                                    {formatInterviewDate(i.scheduledAtUtc)}
                                </div>
                            </div>

                            <div className="recruiter-interview-company">
                                {i.companyName}
                            </div>

                            <div className="recruiter-interview-meta">
                                <span className="recruiter-interview-pill">
                                    <User2 size={14} />
                                    Candidate: {i.candidateName || "Unknown"}
                                </span>

                                <span className="recruiter-interview-pill">
                                    <Clock3 size={14} />
                                    {formatInterviewTime(i.scheduledAtUtc)}
                                </span>
                            </div>

                            <div className="recruiter-interview-footer">
                                <div className="recruiter-interview-time">
                                    Scheduled at {new Date(i.scheduledAtUtc).toLocaleString()}
                                </div>

                                {i.meetingLink ? (
                                    <a
                                        href={i.meetingLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="recruiter-interview-link"
                                    >
                                        <LinkIcon size={14} />
                                        Open Meeting
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}