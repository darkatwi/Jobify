import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCandidateDashboard } from "../services/dashboardService";
import { api } from "../api/api";
import "../pages/styles/dashboard.css";

export default function Dashboard() {
    const [role, setRole] = useState(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem("jobify_user");
            const user = raw ? JSON.parse(raw) : null;
            const roles = user?.roles || [];

            if (roles.includes("Recruiter")) {
                setRole("Recruiter");
            } else {
                setRole("Student");
            }
        } catch {
            setRole("Student");
        }
    }, []);

    if (role === null) {
        return (
            <div style={{ padding: "24px", fontSize: "18px" }}>
                Loading dashboard...
            </div>
        );
    }

    if (role === "Recruiter") {
        return <RecruiterDashboard />;
    }

    return <CandidateDashboard />;
}

function RecruiterDashboard() {
    const navigate = useNavigate();

    const [companyName, setCompanyName] = useState("Organization");
    const [recruiterStats, setRecruiterStats] = useState({
        activeListings: 0,
        applications: 0,
        interviews: 0,
        unansweredQa: 0,
    });
    const [upcomingInterviews, setUpcomingInterviews] = useState([]);
    const [unansweredQuestions, setUnansweredQuestions] = useState([]);
    const [dashboardLoading, setDashboardLoading] = useState(true);

    useEffect(() => {
        async function loadRecruiterName() {
            try {
                const signupRaw = localStorage.getItem("jobify_signup");
                const signupUser = signupRaw ? JSON.parse(signupRaw) : null;

                const profileRaw = localStorage.getItem("jobify_user");
                const profileUser = profileRaw ? JSON.parse(profileRaw) : null;

                const localName =
                    signupUser?.companyName ||
                    profileUser?.companyName ||
                    profileUser?.profile?.companyName ||
                    null;

                if (localName) {
                    setCompanyName(localName);
                    return;
                }

                const res = await api.get("/profile");
                const data = res.data;

                const apiName = data?.profile?.companyName || "Organization";
                setCompanyName(apiName);
            } catch (error) {
                console.error("Failed to load recruiter name:", error);
                setCompanyName("Organization");
            }
        }

        loadRecruiterName();
    }, []);

    useEffect(() => {
        async function loadRecruiterDashboardData() {
            try {
                setDashboardLoading(true);

                const [oppsResult, interviewsResult] = await Promise.allSettled([
                    api.get("/opportunities/my"),
                    api.get("/interviews/recruiter"),
                ]);

                const opportunities =
                    oppsResult.status === "fulfilled" && Array.isArray(oppsResult.value.data)
                        ? oppsResult.value.data
                        : [];

                const interviews =
                    interviewsResult.status === "fulfilled" && Array.isArray(interviewsResult.value.data)
                        ? interviewsResult.value.data
                        : [];

                if (oppsResult.status === "rejected") {
                    console.error("Failed to load recruiter opportunities:", oppsResult.reason);
                }

                if (interviewsResult.status === "rejected") {
                    console.error("Failed to load recruiter interviews:", interviewsResult.reason);
                }

                const qaResults = await Promise.allSettled(
                    opportunities.map((o) => api.get(`/opportunities/${o.id}`))
                );

                const allQuestions = qaResults.flatMap((result, index) => {
                    if (result.status !== "fulfilled") {
                        console.error(
                            `Failed to load Q&A for opportunity ${opportunities[index]?.id}:`,
                            result.reason
                        );
                        return [];
                    }

                    const opportunity = opportunities[index];
                    const qa = Array.isArray(result.value.data?.qa) ? result.value.data.qa : [];

                    return qa.map((q) => ({
                        ...q,
                        opportunityId: opportunity.id,
                        opportunityTitle: opportunity.title,
                        companyName: opportunity.companyName,
                    }));
                });

                const pendingQuestions = allQuestions
                    .filter((q) => !q.answer || !q.answer.trim())
                    .sort((a, b) => new Date(b.askedAtUtc) - new Date(a.askedAtUtc));

                const now = new Date();

                const allFutureInterviews = interviews
                    .filter((i) => new Date(i.scheduledAtUtc) > now)
                    .sort((a, b) => new Date(a.scheduledAtUtc) - new Date(b.scheduledAtUtc));

                const soonLimit = new Date();
                soonLimit.setDate(soonLimit.getDate() + 14);

                const activeListings = opportunities.filter((o) => !o.isClosed).length;

                const totalApplications = opportunities.reduce(
                    (sum, o) => sum + (o.applicantCount ?? o.applicationsCount ?? 0),
                    0
                );

                setUpcomingInterviews(allFutureInterviews);
                setUnansweredQuestions(pendingQuestions);

                setRecruiterStats({
                    activeListings,
                    applications: totalApplications,
                    interviews: allFutureInterviews.length,
                    unansweredQa: pendingQuestions.length,
                });
            } catch (error) {
                console.error("Failed to load recruiter dashboard data:", error);
                setUpcomingInterviews([]);
                setUnansweredQuestions([]);
                setRecruiterStats({
                    activeListings: 0,
                    applications: 0,
                    interviews: 0,
                    unansweredQa: 0,
                });
            } finally {
                setDashboardLoading(false);
            }
        }

        loadRecruiterDashboardData();
    }, []);

    const stats = [
        { title: "Active Listings", value: recruiterStats.activeListings, icon: "📌" },
        { title: "Applications", value: recruiterStats.applications, icon: "📄" },
        { title: "Interviews", value: recruiterStats.interviews, icon: "🗓️" },
        { title: "Unanswered Q&A", value: recruiterStats.unansweredQa, icon: "❓" },
    ];

    const quickActions = [
        {
            title: "Manage Organization",
            description: "Post jobs, manage listings, and review applications.",
            button: "Open Organization",
            onClick: () => navigate("/organization"),
        },
        {
            title: "Interviews",
            description: "Track and schedule recruiter interviews.",
            button: "View Interviews",
            onClick: () => navigate("/organization/interviews"),
        },
        {
            title: "Candidate Q&A",
            description: "Respond to candidate questions and clarify opportunity details.",
            button: "Open Q&A",
            onClick: () => navigate("/organization/qanda"),
        },
    ];

    const sortedInterviews = [...upcomingInterviews].sort(
        (a, b) => new Date(a.scheduledAtUtc) - new Date(b.scheduledAtUtc)
    );

    const soonestInterview = sortedInterviews[0];

    return (
        <div className="dashboard-page">
            <div className="dashboard-hero">
                <h1 className="dashboard-hero-title">
                    Welcome back, {companyName} 👋
                </h1>

                <p className="dashboard-hero-text">
                    Manage your opportunities, review candidates, and keep hiring activity organized from one place.
                </p>

                <div className="dashboard-actions">
                    <button
                        onClick={() => navigate("/organization")}
                        className="btn-primary"
                    >
                        Go to Organization
                    </button>

                    <button
                        onClick={() => navigate("/organization/interviews")}
                        className="btn-secondary"
                    >
                        Interviews
                    </button>

                    <button
                        onClick={() => navigate("/organization/qanda")}
                        className="btn-secondary"
                    >
                        Q&A
                    </button>
                </div>
            </div>

            <div className="dashboard-stats">
                {stats.map((item) => (
                    <StatCard
                        key={item.title}
                        title={item.title}
                        value={item.value}
                        icon={item.icon}
                    />
                ))}
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-panel">
                    <h2 className="dashboard-panel-title">Recruiter Overview</h2>

                    <div className="dashboard-stack-sm">
                        {quickActions.map((item) => (
                            <div key={item.title} className="dashboard-item dashboard-item-static">
                                <div className="dashboard-item-title">
                                    {item.title}
                                </div>

                                <div className="dashboard-item-text">
                                    {item.description}
                                </div>

                                <button onClick={item.onClick} className="btn-primary">
                                    {item.button}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dashboard-side-column">
                    <div className="dashboard-panel">
                        <h2 className="dashboard-panel-title">Upcoming Interview</h2>
                        {dashboardLoading ? (
                            <p style={{ color: "#666" }}>Loading interviews...</p>
                        ) : !soonestInterview ? (
                            <p style={{ color: "#666" }}>No upcoming interviews.</p>
                        ) : (
                            <div key={soonestInterview.id} className="dashboard-item">
                                <h3 className="dashboard-item-title">
                                    {soonestInterview.opportunityTitle}
                                </h3>

                                <div className="dashboard-meta dashboard-meta-strong">
                                    {soonestInterview.companyName}
                                </div>

                                <div className="dashboard-badge-row">
                                    <span className="dashboard-badge">
                                        Candidate: {soonestInterview.candidateName}
                                    </span>
                                    <span className="dashboard-badge">
                                        {new Date(soonestInterview.scheduledAtUtc).toLocaleString()}
                                    </span>
                                </div>

                                {soonestInterview.meetingLink && (
                                    <a
                                        href={soonestInterview.meetingLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="dashboard-link-button"
                                    >
                                        Join Meeting
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="dashboard-panel">
                        <h2 className="dashboard-panel-title">Unanswered Questions</h2>

                        {dashboardLoading ? (
                            <p style={{ color: "#666" }}>Loading questions...</p>
                        ) : unansweredQuestions.length === 0 ? (
                            <p style={{ color: "#666" }}>No unanswered questions right now.</p>
                        ) : (
                            unansweredQuestions.slice(0, 3).map((q) => (
                                <div key={q.id} className="dashboard-item">
                                    <h3 className="dashboard-item-title">
                                        {q.opportunityTitle}
                                    </h3>

                                    <div className="dashboard-badge-row">
                                        <span className="dashboard-badge">
                                            {q.studentName ? `From: ${q.studentName}` : "Candidate question"}
                                        </span>
                                    </div>

                                    <div className="dashboard-question-box">
                                        {q.question}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function CandidateDashboard() {
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [savedOpportunities, setSavedOpportunities] = useState([]);
    const [savedLoading, setSavedLoading] = useState(true);
    const [savedError, setSavedError] = useState("");

    useEffect(() => {
        async function loadDashboard() {
            try {
                const result = await getCandidateDashboard();
                setData(result);
            } catch (err) {
                setError(err.message || "Failed to load dashboard");
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, []);

    useEffect(() => {
        async function loadSavedOpportunities() {
            try {
                setSavedLoading(true);
                setSavedError("");

                const res = await api.get("/opportunities/saved");
                const saved = Array.isArray(res.data) ? res.data : [];

                setSavedOpportunities(saved);
            } catch (err) {
                console.error(err);
                setSavedError(err.message || "Failed to load saved opportunities");
                setSavedOpportunities([]);
            } finally {
                setSavedLoading(false);
            }
        }

        loadSavedOpportunities();
    }, []);

    if (loading) {
        return (
            <div style={{ padding: "24px", fontSize: "18px" }}>
                Loading dashboard...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: "24px", color: "red" }}>
                {error}
            </div>
        );
    }

    const MATCH_THRESHOLD = 50;

    const recommendedOpportunities = (data?.recommendedOpportunities || []).filter(
        (job) => (job.matchScore ?? 0) >= MATCH_THRESHOLD
    );

    const upcomingDeadlines = recommendedOpportunities
        .filter((job) => job.deadlineUtc)
        .sort((a, b) => new Date(a.deadlineUtc) - new Date(b.deadlineUtc))
        .slice(0, 3);

    return (
        <div className="dashboard-page">
            <div className="dashboard-hero">
                <h1 className="dashboard-hero-title">
                    Welcome back, {data?.fullName || "Student"} 👋
                </h1>

                <p className="dashboard-hero-text">
                    Your profile is {data?.profileCompletionPercentage ?? 0}% complete.
                    Complete your profile to unlock better job matches.
                </p>

                <div className="dashboard-progress">
                    <div
                        className="dashboard-progress-bar"
                        style={{ width: `${data?.profileCompletionPercentage ?? 0}%` }}
                    />
                </div>
            </div>

            <div className="dashboard-stats">
                <StatCard
                    title="Profile Completion"
                    value={`${data?.profileCompletionPercentage ?? 0}%`}
                    icon="👤"
                />
                <StatCard title="Skills Added" value={data?.skillsCount ?? 0} icon="🧠" />
                <StatCard title="Applications" value={data?.applicationsCount ?? 0} icon="📄" />
                <StatCard title="Matches Found" value={data?.matchesCount ?? 0} icon="⭐" />
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-panel">
                    <h2 className="dashboard-panel-title">Recommended Opportunities</h2>

                    {recommendedOpportunities.length === 0 ? (
                        <p style={{ color: "#666" }}>
                            No strong recommendations yet. Complete your profile and add skills.
                        </p>
                    ) : (
                        recommendedOpportunities.map((job) => (
                            <OpportunityCard key={job.id} job={job} showScore={true} />
                        ))
                    )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div className="dashboard-panel">
                        <h2 className="dashboard-panel-title">Saved Opportunities</h2>

                        {savedLoading ? (
                            <p style={{ color: "#666" }}>Loading saved opportunities...</p>
                        ) : savedError ? (
                            <p style={{ color: "red" }}>{savedError}</p>
                        ) : savedOpportunities.length === 0 ? (
                            <p style={{ color: "#666" }}>No saved opportunities yet.</p>
                        ) : (
                            savedOpportunities.slice(0, 3).map((job) => (
                                <OpportunityCard key={job.id} job={job} showScore={false} />
                            ))
                        )}

                        <button
                            onClick={() => navigate("/browse")}
                            className="btn-primary dashboard-mt-sm"
                        >
                            View All
                        </button>
                    </div>

                    <div className="dashboard-panel">
                        <h2 className="dashboard-panel-title">Upcoming Deadlines</h2>

                        {upcomingDeadlines.length === 0 ? (
                            <p style={{ color: "#666" }}>No upcoming deadlines found.</p>
                        ) : (
                            upcomingDeadlines.map((job) => (
                                <DeadlineCard key={job.id} job={job} />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon }) {
    return (
        <div className="stat-card">
            <div className="stat-card-icon">{icon}</div>

            <div>
                <div className="stat-card-label">
                    {title}
                </div>
                <div className="stat-card-value">
                    {value}
                </div>
            </div>
        </div>
    );
}

function OpportunityCard({ job, showScore }) {
    const rawScore = job?.matchScore ?? job?.matchPercentage ?? null;

    const badgeClass =
        rawScore >= 80
            ? "match-badge match-badge-green"
            : rawScore >= 60
                ? "match-badge match-badge-blue"
                : "match-badge match-badge-gray";

    return (
        <div className="opportunity-card">
            <div className="opportunity-card-top">
                <div className="opportunity-card-main">
                    <h3 className="opportunity-title">
                        {job.title}
                    </h3>
                    <p className="opportunity-company">
                        {job.companyName}
                    </p>
                    <p className="opportunity-meta">
                        {job.location} {job.workMode ? `• ${job.workMode}` : ""}
                    </p>
                </div>

                {showScore && rawScore !== null && (
                    <div className={badgeClass}>
                        {rawScore}% match
                    </div>
                )}
            </div>
        </div>
    );
}

function DeadlineCard({ job }) {
    const formattedDeadline = new Date(job.deadlineUtc).toLocaleDateString();

    return (
        <div className="deadline-card">
            <h3 className="opportunity-title">
                {job.title}
            </h3>
            <p className="opportunity-company">
                {job.companyName}
            </p>
            <p className="opportunity-meta">
                Closes on {formattedDeadline}
            </p>
        </div>
    );
}

