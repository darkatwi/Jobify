import { useState } from "react";
import { Briefcase, ListChecks, Calendar, FileText } from "lucide-react";
import { MatchesTabs } from "./components/matches/MatchesTabs";
import "./styles/matches.css";
import matches from "./data/matchesData";
export default function MatchesPage() {
    const [activeTab, setActiveTab] = useState("opportunities");

    const tabs = [
        { key: "opportunities", label: "Opportunities", icon: Briefcase },
        { key: "applications", label: "Applications", icon: ListChecks },
        { key: "interviews", label: "Interviews", icon: Calendar },
        { key: "cv-review", label: "CV Review", icon: FileText },
    ];

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
