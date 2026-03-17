import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, ListChecks, Calendar, FileText } from "lucide-react";
import matches from "./data/MatchesData";
import { MatchesTabs } from "./components/matches/MatchesTabs";
import "./styles/matches.css";
import { api } from "../api/api";
import CvReviewPage from "./components/matches/CvReviewPage";

// Normalize Backend Application Statuses (Expected by components)
function normalizeApplicationStatus(status) {
    switch (status) {
        case "InReview":
            return "Under Review";

        case "AssessmentSent":
        case "InAssessment":
        case "AssessmentSubmitted":
            return "Assessment";

        case "Accepted":
            return "Offer";

        case "Rejected":
            return "Rejected";

        default:
            return "Applied";
    }
}

// Format Applied Date
function formatAppliedDate(createdAtUtc) {
    if (!createdAtUtc) return "Applied Recently";

    const date = new Date(createdAtUtc);
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days <= 0) return "Applied Today";
    if (days === 1) return "Applied 1 Day ago";
    if (days < 7) return `Applied ${days} Days ago`;

    const weeks = Math.floor(days / 7);
    if (weeks === 1) return "Applied 1 Week ago";

    return `Applied ${weeks} Weeks ago`;
}

// Format Deadline
function formatDeadline(deadlineUtc) {
    if (!deadlineUtc) return "No Deadline";

    const deadline = new Date(deadlineUtc);
    const diff = deadline.getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return "Closed";
    if (days === 0) return "Closing Today";
    if (days === 1) return "1 Day Left";

    return `${days} Left`;
}

// Format Location
function formatLocation(opportunity) {
    if (opportunity.isRemote) return "Remote";
    if (opportunity.workMode === "Hybrid") return "Hybrid";

    let location = "On-site";

    if (opportunity.location) {
        location = `On-site at ${opportunity.location}`;
    }

    return location;
}

// Logo Color
function getLogoColor(name) {
    const colors = ["blue", "green", "purple", "pink", "indigo", "magenta", "navy", "black"];

    name = String(name || "").trim();
    if (!name) return "blue";

    const n = name.split("").reduce((total, c) => total + c.charCodeAt(0), 0);
    return colors[n % colors.length];
}

export default function MatchesPage() {
    const navigate = useNavigate();

    const tabs = [
        { key: "opportunities", label: "Opportunities", icon: Briefcase },
        { key: "applications", label: "Applications", icon: ListChecks },
        { key: "interviews", label: "Interviews", icon: Calendar },
        { key: "cv-review", label: "CV Review", icon: FileText },
    ];

    const [activeTab, setActiveTab] = useState("opportunities");

    // Opportunities
    const [opportunities, setOpportunities] = useState([]);
    const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
    const [opportunitiesError, setOpportunitiesError] = useState("");

    // Applications
    const [applications, setApplications] = useState([]);
    const [applicationsLoading, setApplicationsLoading] = useState(false);
    const [applicationsError, setApplicationsError] = useState("");

    async function fetchOpportunities() {
        try {
            setOpportunitiesLoading(true);
            setOpportunitiesError("");

            const res = await api.get("/opportunities", {
                params: {
                    sort: "newest",
                    page: 1,
                    pageSize: 12,
                },
            });

            const data = Array.isArray(res.data?.items) ? res.data.items : [];
            setOpportunities(data);
        } catch (error) {
            console.error("Failed to fetch opportunities.", error);
            setOpportunities([]);
            setOpportunitiesError(error?.message || "Failed to fetch opportunities.");
        } finally {
            setOpportunitiesLoading(false);
        }
    }

    async function fetchApplications() {
        try {
            setApplicationsLoading(true);
            setApplicationsError("");

            const res = await api.get("/application/me");

            const data = Array.isArray(res.data) ? res.data : [];
            setApplications(data);
        } catch (error) {
            console.error("Failed to Load Applications.", error);
            setApplicationsError(error?.message || "Failed to Load Applications.");
            setApplications([]);
        } finally {
            setApplicationsLoading(false);
        }
    }

    useEffect(() => {
        fetchOpportunities();
        fetchApplications();
    }, []);

    const mappedApplications = useMemo(() => {
        return applications.map((application) => ({
            id: application.applicationId,
            company: application.companyName,
            jobTitle: application.opportunityTitle,
            status: normalizeApplicationStatus(application.status),
            logoColor: getLogoColor(application.companyName),
            deadline: application.hasAssessment
                ? "Assessment Available"
                : formatAppliedDate(application.createdAtUtc),
        }));
    }, [applications]);

    const mappedOpportunities = useMemo(() => {
        return opportunities.map((opportunity) => {
            const matchedSkills = Array.isArray(opportunity.matchedSkills)
                ? opportunity.matchedSkills.map((skill) => String(skill).toLowerCase())
                : [];

            const skills = Array.isArray(opportunity.skills)
                ? opportunity.skills.map((skill) => ({
                    name: skill,
                    matched: matchedSkills.includes(String(skill).toLowerCase()),
                }))
                : [];

            return {
                id: opportunity.id,
                company: opportunity.companyName,
                jobTitle: opportunity.title,
                location: formatLocation(opportunity),
                status: "Saved",
                matchPercentage: Math.round(opportunity.matchPercentage ?? 0),
                logoColor: getLogoColor(opportunity.companyName),
                deadline: formatDeadline(opportunity.deadlineUtc),
                skills,
            };
        });
    }, [opportunities]);

    const mappedInterviews = useMemo(() => {
        return matches
            .filter((item) => item.status === "Interview")
            .map((item) => ({
                ...item,
                onPrepare: () => navigate(`/interviews/${item.id}/prepare`),
            }));
    }, [navigate]);

    const mappedMatches = useMemo(() => {
        return [...mappedOpportunities, ...mappedApplications, ...mappedInterviews];
    }, [mappedApplications, mappedOpportunities, mappedInterviews]);

    return (
        <div className="matches-page">
            <div className="matches-header">
                <h1 className="matches-title">Matches</h1>
                <p className="matches-subtitle">Manage your job search pipeline.</p>
            </div>

            <div className="matches-tabs">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.key;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`matches-tab ${active ? "active" : ""}`}
                        >
                            <Icon className="matches-tab-icon" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="matches-content">
                {activeTab === "cv-review" ? (
                    <CvReviewPage />
                ) : (
                    <MatchesTabs
                        activeTab={activeTab}
                        matches={mappedMatches}
                        onPrepare={(item) => {
                            navigate(`/interviews/${item.id}/prepare`);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
