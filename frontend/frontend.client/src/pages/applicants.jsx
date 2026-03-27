    import React, { useEffect, useMemo, useRef, useState } from "react";
    import { Calendar, Mail, ChevronDown, Check } from "lucide-react";
    import { useNavigate } from "react-router-dom";
    import { api } from "../api/api";
    import "./styles/applicant.css";


    function ApplicantCard({ applicant, onSchedule, onStatus, onViewProfile, updatingId }) {
        const getStatusClass = (status) => {
            switch (status) {
                case "Pending":
                    return "org-badge pending";
                case "InReview":
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
            if (match >= 75) return "org-match high";
            if (match >= 50) return "org-match medium";
            return "org-match low";
        };

        return (
            <div className="org-card">
                <div className="org-card-top">
                    <div className="org-card-header">
                        <div className="org-card-header-left">
                            <div className="org-applicant-name">{applicant.name}</div>
                        </div>

                        <span className={getStatusClass(applicant.status)}>
                            {applicant.status === "InReview" ? "In Review" : applicant.status}
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
                    <button
                        className="org-btn org-btn-outline"
                        onClick={() => onViewProfile(applicant)}
                    >
                        View Profile
                    </button>

                    <select
                        className="org-select"
                        value={applicant.status}
                        disabled={updatingId === applicant.id}
                        onChange={(e) => onStatus(applicant.id, e.target.value)}
                    >
                        <option value="Pending">Pending</option>
                        <option value="InReview">In Review</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Rejected">Rejected</option>
                    </select>

                    <button
                        className="org-btn org-btn-dark"
                        onClick={() => onSchedule(applicant)}
                        title={
                            applicant.hasActiveInterview
                                ? "Edit scheduled interview"
                                : "Schedule interview"
                        }
                    >
                        {applicant.hasActiveInterview ? "Edit Interview" : "Schedule"}
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
            if (!open || !applicant) return;

            const scheduled = applicant.interviewScheduledAtUtc
                ? new Date(applicant.interviewScheduledAtUtc)
                : null;

            if (scheduled && !Number.isNaN(scheduled.getTime())) {
                const yyyy = scheduled.getUTCFullYear();
                const mm = String(scheduled.getUTCMonth() + 1).padStart(2, "0");
                const dd = String(scheduled.getUTCDate()).padStart(2, "0");
                const hh = String(scheduled.getUTCHours()).padStart(2, "0");
                const min = String(scheduled.getUTCMinutes()).padStart(2, "0");

                setDate(`${yyyy}-${mm}-${dd}`);
                setTime(`${hh}:${min}`);
            } else {
                setDate("");
                setTime("");
            }

            setInterviewType(applicant.interviewType || "online");
            setMeetingLink(applicant.meetingLink || "");
        }, [open, applicant]);

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
                    <h2>{applicant.hasActiveInterview ? "Edit Interview" : "Schedule Interview"}</h2>
                    <p>
                        {applicant.hasActiveInterview
                            ? `Update interview for ${applicant.name}`
                            : `Schedule an interview with ${applicant.name}`}
                    </p>

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
                            {scheduling
                                ? "Saving..."
                                : applicant.hasActiveInterview
                                    ? "Save Changes"
                                    : "Confirm"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    function StatusModal({ open, onClose, onConfirm, applicant, newStatus, loading }) {
        const [message, setMessage] = useState("");
        const [reason, setReason] = useState("");
        const [suggestions, setSuggestions] = useState("");

        useEffect(() => {
            if (!open) return;

            if (newStatus === "Rejected") {
                setMessage(
                    "We regret to inform you that, after careful consideration, your application was not selected to move forward at this time. We sincerely appreciate your interest in this opportunity."
                );
            } else if (newStatus === "Accepted") {
                setMessage(
                    "We are pleased to inform you that your application has been accepted. Congratulations on this achievement. Our team will be in touch shortly with the next steps and any additional information required."
                );
            } else if (newStatus === "Shortlisted") {
                setMessage(
                    "We are pleased to inform you that you have been shortlisted for this opportunity. An interview has been scheduled, and you can find the details in the Interviews tab of your dashboard. We look forward to speaking with you."
                );
            } else {
                setMessage("");
            }

            setReason("");
            setSuggestions("");
        }, [open, newStatus]);

        if (!open || !applicant) return null;

        return (
            <div className="org-modal-overlay">
                <div className="org-modal">
                    <h2>Send {newStatus} Notification</h2>
                    <p>Message to {applicant.name}</p>

                    <textarea
                        className="org-textarea"
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />

                    {newStatus === "Rejected" && (
                        <div className="org-rejection-section">
                            <div className="org-form-group">
                                <label>Reason (optional)</label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="org-input"
                                    placeholder="e.g. Limited experience in required technologies"
                                />
                            </div>

                            <div className="org-form-group">
                                <label>Suggestions (optional)</label>
                                <textarea
                                    value={suggestions}
                                    onChange={(e) => setSuggestions(e.target.value)}
                                    className="org-textarea small"
                                    rows={3}
                                    placeholder="e.g. Strengthen projects, improve CV clarity..."
                                />
                            </div>
                        </div>
                    )}

                    <div className="org-modal-actions">
                        <button className="org-btn org-btn-outline" onClick={onClose}>
                            Cancel
                        </button>

                        <button
                            className="org-btn org-btn-dark"
                            onClick={() =>
                                onConfirm({
                                    message,
                                    reason,
                                    suggestions
                                })
                            }
                            disabled={loading}
                        >
                            {loading ? "Sending..." : "Send"}
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
        if (value === "in review" || value === "inreview") return "InReview";
        if (value === "shortlisted") return "Shortlisted";
        if (value === "accepted") return "Accepted";
        if (value === "rejected") return "Rejected";

        return status;
    }

    function buildInterviewDateTime(date, time) {
        return `${date}T${time}:00Z`;
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
                : new Date(start.getTime() + 60 * 60 * 1000);

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

        const interviewScheduledAtUtc =
            item.interviewScheduledAtUtc ||
            item.scheduledAtUtc ||
            item.nextInterviewAtUtc ||
            item.interviewDateUtc ||
            null;

        return {
            id: String(item.applicationId ?? item.id),
            applicationId: item.applicationId ?? item.id,
            opportunityId: item.opportunityId,
            userId: item.userId || item.studentUserId,
            name: fullName,
            email,
            status: normalizeStatus(item.status),
            dateApplied: formatDate(appliedAt),
            assessmentScore,
            matchPercentage: Number(matchPercentage) || 0,

            hasActiveInterview:
                item.hasActiveInterview ??
                hasActiveInterview(item),

            interviewId: item.interviewId ?? null,
            interviewScheduledAtUtc,
            meetingLink: item.meetingLink || "",
            interviewType: item.location === "On-site" ? "onsite" : "online",
            location: item.location || "",

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
        const navigate = useNavigate();
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

        const [statusModalOpen, setStatusModalOpen] = useState(false);
        const [selectedStatus, setSelectedStatus] = useState("");
        const [selectedApplicantForStatus, setSelectedApplicantForStatus] = useState(null);
        const [sendingStatus, setSendingStatus] = useState(false);

        const [stageFilter, setStageFilter] = useState("All");

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

                const existingInterview = existing.interviewScheduledAtUtc
                    ? new Date(existing.interviewScheduledAtUtc).getTime()
                    : 0;

                const currentInterview = applicant.interviewScheduledAtUtc
                    ? new Date(applicant.interviewScheduledAtUtc).getTime()
                    : 0;

                if (currentInterview > existingInterview) {
                    byUser.set(key, applicant);
                    continue;
                }

                const existingScore = existing.matchPercentage ?? 0;
                const currentScore = applicant.matchPercentage ?? 0;

                if (currentInterview === existingInterview && currentScore > existingScore) {
                    byUser.set(key, applicant);
                }
            }

            return Array.from(byUser.values()).sort(
                (a, b) => (b.matchPercentage ?? 0) - (a.matchPercentage ?? 0)
            );
        }, [applicants]);

        const filteredApplicants = useMemo(() => {
            if (stageFilter === "All") return sortedApplicants;
            return sortedApplicants.filter((applicant) => applicant.status === stageFilter);
        }, [sortedApplicants, stageFilter]);

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

                const payload = {
                    applicationId: applicant.applicationId,
                    scheduledAtUtc,
                    location: interviewType === "online" ? "Online" : "On-site",
                    meetingLink: meetingLink || null,
                };

                const existingInterviewId =
                    applicant.interviewId ??
                    applicant.InterviewId ??
                    null;

                console.log("INTERVIEW APPLICANT:", applicant);
                console.log("INTERVIEW PAYLOAD:", payload);
                console.log("EDIT CHECK:", {
                    hasActiveInterview: applicant.hasActiveInterview,
                    interviewId: existingInterviewId,
                });

                if (applicant.hasActiveInterview && existingInterviewId) {
                    await api.put(`/Interviews/${existingInterviewId}`, payload);
                    alert("Interview updated successfully.");
                } else {
                    await api.post("/Interviews", payload);
                    alert("Interview scheduled successfully.");
                }

                await fetchApplicantsForOpportunity(selectedOpportunityId);
                setModalOpen(false);
                setSelectedApplicant(null);
            } catch (err) {
                console.error("Interview save failed:", err);
                alert("Failed to save interview.");
            } finally {
                setScheduling(false);
            }
        };

        const handleViewProfile = (applicant) => {
            navigate(`/organization/applicants/${applicant.applicationId}/profile`);
        };

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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
            setSelectedApplicant(applicant);
            setModalOpen(true);
        };

        

        const handleStatus = (id, status) => {
            const applicant = applicants.find((a) => a.id === id);

            if (["Rejected", "Accepted", "Shortlisted"].includes(status)) {
                setSelectedApplicantForStatus(applicant);
                setSelectedStatus(status);
                setStatusModalOpen(true);
                return;
            }

            updateStatusOnly(id, status);
        };

        const updateStatusOnly = async (id, status) => {
            const oldApplicants = [...applicants];

            setApplicants((prev) =>
                prev.map((a) => (a.id === id ? { ...a, status } : a))
            );

            setUpdatingId(id);

            try {
                await api.patch(`/Application/${id}/status`, { status });
                await fetchApplicantsForOpportunity(selectedOpportunityId);
            } catch (err) {
                setApplicants(oldApplicants);
                alert("Failed to update status.");
            } finally {
                setUpdatingId(null);
            }
        };

        const handleConfirmStatus = async ({ message, reason, suggestions }) => {
            if (!selectedApplicantForStatus) return;

            setSendingStatus(true);

            try {
                let finalMessage = message;

                if (selectedStatus === "Rejected") {
                    if (reason?.trim()) {
                        finalMessage += `\n\nReason:\n${reason.trim()}`;
                    }

                    if (suggestions?.trim()) {
                        finalMessage += `\n\nSuggestions for improvement:\n${suggestions.trim()}`;
                    }
                }

                await api.patch(`/Application/${selectedApplicantForStatus.id}/status`, {
                    status: selectedStatus
                });

                await fetchApplicantsForOpportunity(selectedOpportunityId);

                await api.post(`/Notifications`, {
                    userId: selectedApplicantForStatus.userId,
                    title: `Application ${selectedStatus}`,
                    message: finalMessage
                });

                setApplicants((prev) =>
                    prev.map((a) =>
                        a.id === selectedApplicantForStatus.id
                            ? { ...a, status: selectedStatus }
                            : a
                    )
                );

                setStatusModalOpen(false);
                setSelectedApplicantForStatus(null);
                setSelectedStatus("");
            } catch (err) {
                console.error(err);
                alert("Failed to send notification.");
            } finally {
                setSendingStatus(false);
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
                                <span>{selectedOpportunityTitle || "Select job"}</span>
                                <ChevronDown size={16} />
                            </div>

                            {openDropdown && (
                                <div className="org-dropdown-menu">
                                    {opportunities.length === 0 ? (
                                        <div className="org-dropdown-item disabled">
                                            {loadingJobs ? "Loading jobs..." : "No jobs found"}
                                        </div>
                                    ) : (
                                        opportunities.map((job) => {
                                            const isActive =
                                                String(job.id) === String(selectedOpportunityId);

                                            return (
                                                <div
                                                    key={job.id}
                                                    className={`org-dropdown-item ${isActive ? "active" : ""}`}
                                                    onClick={() => {
                                                        setSelectedOpportunityId(String(job.id));
                                                        setSelectedOpportunityTitle(job.title);
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

                    <div className="org-filters-row">
                        <select
                            className="org-stage-filter"
                            value={stageFilter}
                            onChange={(e) => setStageFilter(e.target.value)}
                        >
                            <option value="All">All stages</option>
                            <option value="Pending">Pending</option>
                            <option value="InReview">In Review</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>

                    {loadingApplicants ? (
                        <p>Loading applicants...</p>
                    ) : error ? (
                        <p>{error}</p>
                    ) : filteredApplicants.length === 0 ? (
                        <p>No applicants found for this stage.</p>
                    ) : (
                        <div className="org-grid">
                            {filteredApplicants.map((a) => (
                                <ApplicantCard
                                    key={a.id}
                                    applicant={a}
                                    onSchedule={handleSchedule}
                                    onStatus={handleStatus}
                                    onViewProfile={handleViewProfile}
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

                <StatusModal
                    open={statusModalOpen}
                    onClose={() => {
                        setStatusModalOpen(false);
                        setSelectedApplicantForStatus(null);
                        setSelectedStatus("");
                    }}
                    applicant={selectedApplicantForStatus}
                    newStatus={selectedStatus}
                    onConfirm={handleConfirmStatus}
                    loading={sendingStatus}
                />
            </div>
        );
    }
