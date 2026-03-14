import { useState, useNavigate } from "react";
import { Briefcase, ListChecks, Calendar, FileText } from "lucide-react";
import "./styles/matches.css";
import { api } from "../api/api";


const API_BASE = "http://localhost:5159/api";

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
    const [applications, setApplications] = useState(matches.applications);
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
