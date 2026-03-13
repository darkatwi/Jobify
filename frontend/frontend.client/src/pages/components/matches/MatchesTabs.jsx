import {
    OpportunitiesTab,
    ApplicationsTab,
    InterviewsTab,
    CVReviewTab,
} from "./MatchCard";

export function MatchesTabs({ activeTab, matches }) {
    if (activeTab === "applications") {
        return <ApplicationsTab matches={matches} />;
    }

    if (activeTab === "interviews") {
        return <InterviewsTab matches={matches} />;
    }

    if (activeTab === "cv-review") {
        return <CVReviewTab />;
    }

    return <OpportunitiesTab matches={matches} />;
}
