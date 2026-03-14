import { useState, useNavigate, useEffect } from "react";
import { Briefcase, ListChecks, Calendar, FileText } from "lucide-react";
import "./styles/matches.css";
import { api } from "../api/api";


const API_BASE = "http://localhost:5159/api";

// Normalize Backend Application Statuses (Expected by components)
function normalizeApplicationStatus(status) {
    switch(status) {
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
    if(!createdAtUtc) return "Applied Recently";

    const date = new Date(createdAtUtc);
    
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / (1000*60*60*24));

    if(days<=0)
        return "Applied Today"
    if(days==1)
        return "Applied 1 Day ago"
    if(days<7)
        return `Applied ${days} Days ago`

    const weeks = Math.floor(days/7);
    if(weeks==1)
        return "Applied 1 Week ago"

    return `Applied ${weeks} Weeks ago`
        
}

export default function MatchesPage() {

    const tabs = [
        { key: "opportunities", label: "Opportunities", icon: Briefcase },
        { key: "applications", label: "Applications", icon: ListChecks },
        { key: "interviews", label: "Interviews", icon: Calendar },
        { key: "cv-review", label: "CV Review", icon: FileText },
    ];

    const [activeTab, setActiveTab] = useState("opportunities");

    const navigate = useNavigate();

    // Opportunities
    const [opportunities, setOpportunities] = useState([]);
    const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
    const [opportunitiesError, setOpportunitiesError] = useState("");

    // Applications
    const [applications, setApplications] = useState([]);
    const [applicationsLoading, setApplicationsLoading] = useState(false);
    const [applicationsError, setApplicationsError] = useState("");

    // Opportunities Fetching Function
    async function fetchOpportunities() {
        try {
            setOpportunitiesLoading(true);
            setOpportunitiesError("");

            const res = await api.get("/api/opportunities", {
                params: {
                    sort: "newest",
                    page: 1,
                    pageSize: 12
                }
            });

            const data = Array.isArray(res.data?.items) ? res.data.items : [];
            setOpportunities(data);
        }
        catch(error) {
            console.error("Failed to fetch opportunities.");
            setOpportunities([]);
            setOpportunitiesError(error?.message || "Failed to fetch opportunities.")
        }
        finally {
            setOpportunitiesLoading(false);
        } 
    }

    // Applications Fetching Function
    async function fetchApplications() {
        try {
            setApplicationsLoading(true);
            setApplicationsError("");

            const res = await api.get("/api/applications/me");

            const data = Array.isArray(res.data) ? res.data : [];
            setApplications(data);
        }
        catch(error) {
            console.error("Failed to Load Applications.")
            setApplicationsError(error?.message || "Failed to Load Applications.")
            setApplications([]);
        }
        finally {
            setApplicationsLoading(false);
        }
    }

    // Load Opportunities and Applications When The Page is Mounted
    useEffect(() => {
        fetchOpportunities();
        fetchApplications;
    }, []);

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
                <MatchesTabs activeTab={activeTab} matches={matches} />
            </div>
        </div>
    );
}
