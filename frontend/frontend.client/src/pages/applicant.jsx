import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Mail, ChevronDown, Check } from "lucide-react";
import { api } from "../api/api";
import "./styles/applicant.css";

function ApplicantCard({ applicant, onSchedule, onStatus, updatingId }) {
    const getStatusClass = (status) => {
        switch (status) {
            case "Pending":
                return "org-badge pending";
            case "In Review":
                return "org-badge review";
            case "Shortlisted":
                return "org-badge shortlisted";
            case "Accepted":
                return "org-badge accepted";
            case "Rejected":
                return "org-badge rejected";
            default:
                return "org-badge";
        }
    };

    const getMatchClass = (match) => {
        if (match >= 75) return "org-match high";   // GREEN
        if (match >= 50) return "org-match medium"; // BLUE
        return "org-match low";                     // RED
    };

    return (
        <div className="org-card">
            <div className="org-card-top">
                <div className="org-card-header">
                    <div className="org-card-header-left">
                        <div className="org-applicant-name">{applicant.name}</div>
                    </div>

                    <span className={getStatusClass(applicant.status)}>
                        {applicant.status}
                    </span>
                </div>
            </div>

            <div className="org-card-info">
                <div>
                    <Mail size={14} />
                    <span>{applicant.email}</span>
                </div>

                <div>
                    <Calendar size={14} />
                    <span>{applicant.dateApplied}</span>
                </div>
            </div>

            <div className="org-card-meta">
                <span className={getMatchClass(applicant.matchPercentage)}>
                    {applicant.matchPercentage}% Match
                </span>

                {applicant.assessmentScore !== undefined &&
                    applicant.assessmentScore !== null && (
                        <span className="org-score">
                            {applicant.assessmentScore}/100
                        </span>
                    )}
            </div>

            <div className="org-card-actions">
                <button className="org-btn org-btn-outline">
                    View Profile
                </button>

                <select
                    className="org-select"
                    value={applicant.status}
                    disabled={updatingId === applicant.id}
                    onChange={(e) => onStatus(applicant.id, e.target.value)}
                >
                    <option value="Pending">Pending</option>
                    <option value="In Review">In Review</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                </select>

                <button
                    className="org-btn org-btn-dark"
                    onClick={() => onSchedule(applicant)}
                    disabled={applicant.hasActiveInterview}
                    title={
                        applicant.hasActiveInterview
                            ? "This applicant already has an upcoming interview."
                            : "Schedule interview"
                    }
                >
                    {applicant.hasActiveInterview ? "Interview Scheduled" : "Schedule"}
                </button>
            </div>
        </div>
    );
}

function ScheduleInterviewModal({
    open,
    onClose,
    applicant,
    onConfirm,
    scheduling,
}) {
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [interviewType, setInterviewType] = useState("online");
    const [meetingLink, setMeetingLink] = useState("");

    useEffect(() => {
        if (!open) {
            setDate("");
            setTime("");
            setInterviewType("online");
            setMeetingLink("");
        }
    }, [open]);

    if (!open || !applicant) return null;

    const handleSubmit = async () => {
        if (!date || !time) {
            alert("Please select date and time.");
            return;
        }

        await onConfirm({
            applicant,
            date,
            time,
            interviewType,
            meetingLink,
        });
    };

    return (
        <div className="org-modal-overlay">
            <div className="org-modal">
                <h2>Schedule Interview</h2>
                <p>Schedule an interview with {applicant.name}</p>

                <div className="org-form-group">
                    <label>Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>

                <div className="org-form-group">
                    <label>Time</label>
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                    />
                </div>

                <div className="org-form-group">
                    <label>Type</label>
                    <select
                        value={interviewType}
                        onChange={(e) => setInterviewType(e.target.value)}
                    >
                        <option value="online">Online</option>
                        <option value="onsite">On-site</option>
                    </select>
                </div>

                <div className="org-form-group">
                    <label>Meeting Link</label>
                    <input
                        type="url"
                        placeholder="https://meet.google.com/..."
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                    />
                </div>

                <div className="org-modal-actions">
                    <button
                        className="org-btn org-btn-outline"
                        onClick={onClose}
                        disabled={scheduling}
                    >
                        Cancel
                    </button>
                    <button
                        className="org-btn org-btn-dark"
                        onClick={handleSubmit}
                        disabled={scheduling}
                    >
                        {scheduling ? "Saving..." : "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function formatDate(dateValue) {
    if (!dateValue) return "—";
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return String(dateValue);
    return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function normalizeStatus(status) {
    if (!status) return "Pending";

    const value = String(status).trim().toLowerCase();

    if (value === "pending") return "Pending";
    if (value === "in review" || value === "inreview" || value === "review") {
        return "In Review";
    }
    if (value === "shortlisted") return "Shortlisted";
    if (value === "accepted") return "Accepted";
    if (value === "rejected") return "Rejected";

    return status;
}

function buildInterviewDateTime(date, time) {
    return new Date(`${date}T${time}:00`).toISOString();
}

function hasActiveInterview(item) {
    const scheduledAt =
        item.interviewScheduledAtUtc ||
        item.scheduledAtUtc ||
        item.nextInterviewAtUtc ||
        item.interviewDateUtc ||
        item.raw?.interviewScheduledAtUtc;

    if (!scheduledAt) return false;

    const start = new Date(scheduledAt);
    if (Number.isNaN(start.getTime())) return false;

    const end =
        item.interviewEndsAtUtc
            ? new Date(item.interviewEndsAtUtc)
            : new Date(start.getTime() + 60 * 60 * 1000); // assume 1 hour

    return end > new Date();
}

function mapApplicationToApplicant(item) {
    const fullName =
        item.candidateName ||
        item.studentName ||
        item.applicantName ||
        item.userName ||
        item.fullName ||
        (item.candidateEmail
            ? item.candidateEmail.split("@")[0]
            : "Unknown Applicant");

    const email =
        item.candidateEmail ||
        item.studentEmail ||
        item.email ||
        item.userEmail ||
        "No email";

    const appliedAt =
        item.createdAtUtc ||
        item.appliedAtUtc ||
        item.createdAt ||
        item.appliedAt;

    const assessmentScore = item.assessmentScore ?? item.score ?? null;

    const matchPercentage =
        item.matchPercentage ?? item.recommendationPercentage ?? 0;

    return {
        id: String(item.applicationId ?? item.id),
        applicationId: item.applicationId ?? item.id,
        opportunityId: item.opportunityId,
        userId: item.userId,
        name: fullName,
        email,
        status: normalizeStatus(item.status),
        dateApplied: formatDate(appliedAt),
        assessmentScore,
        matchPercentage: Number(matchPercentage) || 0,
        hasActiveInterview: hasActiveInterview(item),
        raw: item,
    };
}

function mapOpportunity(item) {
    return {
        id: item.id,
        title: item.title || item.jobTitle || "Untitled Opportunity",
    };
}

export default function Applicants() {
    const [opportunities, setOpportunities] = useState([]);
    const [selectedOpportunityId, setSelectedOpportunityId] = useState("");
    const [selectedOpportunityTitle, setSelectedOpportunityTitle] = useState("");
    const [openDropdown, setOpenDropdown] = useState(false);

    const [applicants, setApplicants] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [loadingApplicants, setLoadingApplicants] = useState(false);
    const [error, setError] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [scheduling, setScheduling] = useState(false);

    const dropdownRef = useRef(null);

    const sortedApplicants = useMemo(() => {
        const byUser = new Map();

        for (const applicant of applicants) {
            const key =
                applicant.userId ||
                applicant.email?.toLowerCase() ||
                applicant.id;

            const existing = byUser.get(key);

            if (!existing) {
                byUser.set(key, applicant);
                continue;
            }

            const existingScore = existing.matchPercentage ?? 0;
            const currentScore = applicant.matchPercentage ?? 0;

            // keep the better one
            if (currentScore > existingScore) {
                byUser.set(key, applicant);
                continue;
            }

            // if same score, prefer the one with assessment score
            const existingHasAssessment =
                existing.assessmentScore !== null &&
                existing.assessmentScore !== undefined;
            const currentHasAssessment =
                applicant.assessmentScore !== null &&
                applicant.assessmentScore !== undefined;

            if (!existingHasAssessment && currentHasAssessment) {
                byUser.set(key, applicant);
            }
        }

        return Array.from(byUser.values()).sort(
            (a, b) => (b.matchPercentage ?? 0) - (a.matchPercentage ?? 0)
        );
    }, [applicants]);


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setOpenDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const fetchOpportunities = async () => {
        try {
            setLoadingJobs(true);
            setError("");

            const res = await api.get("/Opportunities/my");
            const data = Array.isArray(res.data) ? res.data : [];
            const mapped = data.map(mapOpportunity);

            setOpportunities(mapped);

            if (mapped.length > 0) {
                setSelectedOpportunityId(String(mapped[0].id));
                setSelectedOpportunityTitle(mapped[0].title);
            }
        } catch (err) {
            console.error("Failed to load opportunities:", err);
            setError("Failed to load job postings.");
        } finally {
            setLoadingJobs(false);
        }
    };

    const fetchApplicantsForOpportunity = async (opportunityId) => {
        if (!opportunityId) {
            setApplicants([]);
            return;
        }

        try {
            setLoadingApplicants(true);
            setError("");

            const res = await api.get(
                `/Application/recruiter/opportunity/${opportunityId}`
            );
            const data = Array.isArray(res.data) ? res.data : [];
            setApplicants(data.map(mapApplicationToApplicant));
        } catch (err) {
            console.error("Failed to load applicants:", err);
            setApplicants([]);
            setError("Failed to load applicants for this job.");
        } finally {
            setLoadingApplicants(false);
        }
    };

    useEffect(() => {
        fetchOpportunities();
    }, []);

    useEffect(() => {
        if (selectedOpportunityId) {
            const selectedJob = opportunities.find(
                (job) => String(job.id) === String(selectedOpportunityId)
            );
            setSelectedOpportunityTitle(selectedJob?.title || "");
            fetchApplicantsForOpportunity(selectedOpportunityId);
        }
    }, [selectedOpportunityId, opportunities]);

    const handleSchedule = (applicant) => {
        if (applicant.hasActiveInterview) {
            alert("This applicant already has an upcoming interview scheduled.");
            return;
        }

        setSelectedApplicant(applicant);
        setModalOpen(true);
    };

    const handleStatus = async (id, status) => {
        const oldApplicants = [...applicants];

        setApplicants((prev) =>
            prev.map((a) => (a.id === id ? { ...a, status } : a))
        );
        setUpdatingId(id);

        try {
            await api.patch(`/Application/${id}/status`, { status });
        } catch (err) {
            console.error("Failed to update status:", err);
            setApplicants(oldApplicants);
            alert("Failed to update status.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleConfirmInterview = async ({
        applicant,
        date,
        time,
        interviewType,
        meetingLink,
    }) => {
        setScheduling(true);

        try {
            const scheduledAtUtc = buildInterviewDateTime(date, time);

            await api.post("/Interviews", {
                applicationId: applicant.applicationId,
                scheduledAtUtc,
                type: interviewType,
                meetingLink: meetingLink || null,
            });

            setModalOpen(false);
            setSelectedApplicant(null);
            alert("Interview scheduled successfully.");
        } catch (err) {
            console.error("Failed to schedule interview:", err);
            alert("Failed to schedule interview.");
        } finally {
            setScheduling(false);
        }
    };

    return (
        <div className="org-page">
            <div className="org-content full">
                <h2>Applications</h2>
                <p className="org-subtitle">
                    Manage and review job applications
                </p>

                <div className="org-job-select-wrap" ref={dropdownRef}>
                    <div className="org-dropdown">
                        <div
                            className="org-dropdown-trigger"
                            onClick={() =>
                                !loadingJobs &&
                                opportunities.length > 0 &&
                                setOpenDropdown((prev) => !prev)
                            }
                        >
                            <span>
                                {selectedOpportunityTitle || "Select job"}
                            </span>
                            <ChevronDown size={16} />
                        </div>

                        {openDropdown && (
                            <div className="org-dropdown-menu">
                                {opportunities.length === 0 ? (
                                    <div className="org-dropdown-item disabled">
                                        {loadingJobs
                                            ? "Loading jobs..."
                                            : "No jobs found"}
                                    </div>
                                ) : (
                                    opportunities.map((job) => {
                                        const isActive =
                                            String(job.id) ===
                                            String(selectedOpportunityId);

                                        return (
                                            <div
                                                key={job.id}
                                                className={`org-dropdown-item ${isActive ? "active" : ""
                                                    }`}
                                                onClick={() => {
                                                    setSelectedOpportunityId(
                                                        String(job.id)
                                                    );
                                                    setSelectedOpportunityTitle(
                                                        job.title
                                                    );
                                                    setOpenDropdown(false);
                                                }}
                                            >
                                                <span>{job.title}</span>
                                                {isActive && <Check size={16} />}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {selectedOpportunityTitle ? (
                    <p className="org-selected-job">
                        Showing applicants for:{" "}
                        <strong>{selectedOpportunityTitle}</strong>
                    </p>
                ) : null}

                {loadingApplicants ? (
                    <p>Loading applicants...</p>
                ) : error ? (
                    <p>{error}</p>
                ) : sortedApplicants.length === 0 ? (
                    <p>No applicants found.</p>
                ) : (
                    <div className="org-grid">
                        {sortedApplicants.map((a) => (
                            <ApplicantCard
                                key={a.id}
                                applicant={a}
                                onSchedule={handleSchedule}
                                onStatus={handleStatus}
                                updatingId={updatingId}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ScheduleInterviewModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                applicant={selectedApplicant}
                onConfirm={handleConfirmInterview}
                scheduling={scheduling}
            />
        </div>
    );
}
