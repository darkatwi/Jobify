import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCandidateDashboard } from "../services/dashboardService";
import { api } from "../api/api";

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
            <div style={{ padding: "24px", fontSize: "18px", color: "var(--text)" }}>
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
    const [interviewPreview, setInterviewPreview] = useState([]);
    const [showingSoonOnly, setShowingSoonOnly] = useState(false);
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

                const soonInterviews = allFutureInterviews.filter(
                    (i) => new Date(i.scheduledAtUtc) <= soonLimit
                );

                const preview =
                    soonInterviews.length > 0
                        ? soonInterviews.slice(0, 3)
                        : allFutureInterviews.slice(0, 3);

                const activeListings = opportunities.filter((o) => !o.isClosed).length;

                const totalApplications = opportunities.reduce(
                    (sum, o) => sum + (o.applicantCount ?? o.applicationsCount ?? 0),
                    0
                );

                setUpcomingInterviews(allFutureInterviews);
                setInterviewPreview(preview);
                setShowingSoonOnly(soonInterviews.length > 0);
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
                setInterviewPreview([]);
                setShowingSoonOnly(false);
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

    return (
        <div
            style={{
                padding: "24px",
                background: "var(--bg)",
                minHeight: "100vh",
                color: "var(--text)",
            }}
        >
            <div
                style={{
                    background: "linear-gradient(135deg, #2563eb, #60a5fa)",
                    color: "white",
                    borderRadius: "20px",
                    padding: "28px",
                    marginBottom: "28px",
                    boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
                }}
            >
                <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>
                    Welcome back, {companyName} 👋
                </h1>

                <p style={{ marginTop: "8px", marginBottom: "18px", opacity: 0.95 }}>
                    Manage your opportunities, review candidates, and keep hiring activity organized from one place.
                </p>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <button onClick={() => navigate("/organization")} style={primaryButtonStyle}>
                        Go to Organization
                    </button>

                    <button onClick={() => navigate("/organization/interviews")} style={secondaryButtonStyle}>
                        Interviews
                    </button>

                    <button onClick={() => navigate("/organization/qanda")} style={secondaryButtonStyle}>
                        Q&amp;A
                    </button>
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                    marginBottom: "28px",
                }}
            >
                {stats.map((item) => (
                    <StatCard
                        key={item.title}
                        title={item.title}
                        value={item.value}
                        icon={item.icon}
                    />
                ))}
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: "20px",
                }}
            >
                <div style={panelStyle}>
                    <h2 style={panelTitleStyle}>Recruiter Overview</h2>

                    <div style={{ display: "grid", gap: "14px" }}>
                        {quickActions.map((item) => (
                            <div
                                key={item.title}
                                style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: "14px",
                                    padding: "18px",
                                    background: "var(--card)",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "18px",
                                        fontWeight: "700",
                                        color: "var(--text)",
                                        marginBottom: "8px",
                                    }}
                                >
                                    {item.title}
                                </div>

                                <div style={{ color: "var(--muted)", marginBottom: "12px" }}>
                                    {item.description}
                                </div>

                                <button onClick={item.onClick} style={primaryButtonStyle}>
                                    {item.button}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={panelStyle}>
                        <h2 style={panelTitleStyle}>
                            {showingSoonOnly ? "Upcoming Interviews" : "Scheduled Interviews"}
                        </h2>

                        {dashboardLoading ? (
                            <p style={{ color: "var(--muted)" }}>Loading interviews...</p>
                        ) : interviewPreview.length === 0 ? (
                            <p style={{ color: "var(--muted)" }}>No interviews scheduled yet.</p>
                        ) : (
                            interviewPreview.map((interview) => (
                                <div
                                    key={interview.id}
                                    style={modernCardStyle}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-3px)";
                                        e.currentTarget.style.boxShadow = "0 12px 24px rgba(15, 23, 42, 0.08)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "0 4px 14px rgba(15, 23, 42, 0.04)";
                                    }}
                                >
                                    <h3 style={jobTitleStyle}>{interview.opportunityTitle}</h3>

                                    <div
                                        style={{
                                            ...metaTextStyle,
                                            marginTop: "8px",
                                            fontWeight: "600",
                                            color: "var(--text)",
                                        }}
                                    >
                                        {interview.companyName}
                                    </div>

                                    <div style={badgeRowStyle}>
                                        <span style={softBadgeStyle}>
                                            Candidate: {interview.candidateName}
                                        </span>
                                        <span style={softBadgeStyle}>
                                            {new Date(interview.scheduledAtUtc).toLocaleString()}
                                        </span>
                                    </div>

                                    {interview.meetingLink && (
                                        <a
                                            href={interview.meetingLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={actionButtonStyle}
                                        >
                                            Join Meeting
                                        </a>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div style={panelStyle}>
                        <h2 style={panelTitleStyle}>Candidate Q&amp;A</h2>

                        {dashboardLoading ? (
                            <p style={{ color: "var(--muted)" }}>Loading questions...</p>
                        ) : unansweredQuestions.length === 0 ? (
                            <p style={{ color: "var(--muted)" }}>No candidate questions yet.</p>
                        ) : (
                            unansweredQuestions.slice(0, 3).map((q) => (
                                <div
                                    key={q.id}
                                    style={modernCardStyle}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-3px)";
                                        e.currentTarget.style.boxShadow = "0 12px 24px rgba(15, 23, 42, 0.08)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "0 4px 14px rgba(15, 23, 42, 0.04)";
                                    }}
                                >
                                    <h3 style={jobTitleStyle}>{q.opportunityTitle}</h3>

                                    <div style={badgeRowStyle}>
                                        <span style={softBadgeStyle}>
                                            {q.studentName ? `From: ${q.studentName}` : "Candidate question"}
                                        </span>
                                    </div>

                                    <div style={subtleQuestionStyle}>{q.question}</div>
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
            <div style={{ padding: "24px", fontSize: "18px", color: "var(--text)" }}>
                Loading dashboard...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: "24px", color: "var(--danger, #ef4444)" }}>
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
        <div
            style={{
                padding: "24px",
                background: "var(--bg)",
                minHeight: "100vh",
                color: "var(--text)",
            }}
        >
            <div
                style={{
                    background: "linear-gradient(135deg, #2563eb, #60a5fa)",
                    color: "white",
                    borderRadius: "20px",
                    padding: "28px",
                    marginBottom: "28px",
                    boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
                }}
            >
                <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>
                    Welcome back, {data?.fullName || "Student"} 👋
                </h1>

                <p style={{ marginTop: "8px", marginBottom: "16px", opacity: 0.95 }}>
                    Your profile is {data?.profileCompletionPercentage ?? 0}% complete.
                    Complete your profile to unlock better job matches.
                </p>

                <div
                    style={{
                        width: "100%",
                        height: "10px",
                        background: "rgba(255,255,255,0.3)",
                        borderRadius: "999px",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            width: `${data?.profileCompletionPercentage ?? 0}%`,
                            height: "100%",
                            background: "white",
                            borderRadius: "999px",
                        }}
                    />
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                    marginBottom: "28px",
                }}
            >
                <StatCard
                    title="Profile Completion"
                    value={`${data?.profileCompletionPercentage ?? 0}%`}
                    icon="👤"
                />
                <StatCard title="Skills Added" value={data?.skillsCount ?? 0} icon="🧠" />
                <StatCard title="Applications" value={data?.applicationsCount ?? 0} icon="📄" />
                <StatCard title="Matches Found" value={data?.matchesCount ?? 0} icon="⭐" />
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
                    gap: "20px",
                    alignItems: "start",
                }}
            >
                <div style={panelStyle}>
                    <h2 style={panelTitleStyle}>Recommended Opportunities</h2>

                    {recommendedOpportunities.length === 0 ? (
                        <p style={{ color: "var(--muted)" }}>
                            No strong recommendations yet. Complete your profile and add skills.
                        </p>
                    ) : (
                        recommendedOpportunities.map((job) => (
                            <OpportunityCard key={job.id} job={job} showScore={true} />
                        ))
                    )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={panelStyle}>
                        <h2 style={panelTitleStyle}>Saved Opportunities</h2>

                        {savedLoading ? (
                            <p style={{ color: "var(--muted)" }}>Loading saved opportunities...</p>
                        ) : savedError ? (
                            <p style={{ color: "var(--danger, #ef4444)" }}>{savedError}</p>
                        ) : savedOpportunities.length === 0 ? (
                            <p style={{ color: "var(--muted)" }}>No saved opportunities yet.</p>
                        ) : (
                            savedOpportunities.slice(0, 3).map((job) => (
                                <OpportunityCard key={job.id} job={job} showScore={false} />
                            ))
                        )}

                        <button
                            onClick={() => navigate("/browse")}
                            style={{
                                ...primaryButtonStyle,
                                marginTop: "12px",
                            }}
                        >
                            View All
                        </button>
                    </div>

                    <div style={panelStyle}>
                        <h2 style={panelTitleStyle}>Upcoming Deadlines</h2>

                        {upcomingDeadlines.length === 0 ? (
                            <p style={{ color: "var(--muted)" }}>No upcoming deadlines found.</p>
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
        <div
            style={{
                background: "var(--card)",
                borderRadius: "16px",
                padding: "20px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)";
            }}
        >
            <div style={{ fontSize: "28px" }}>{icon}</div>

            <div>
                <div style={{ color: "var(--muted)", marginBottom: "6px", fontSize: "14px" }}>
                    {title}
                </div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--text)" }}>
                    {value}
                </div>
            </div>
        </div>
    );
}

function OpportunityCard({ job, showScore }) {
    const rawScore = job?.matchScore ?? job?.matchPercentage ?? null;

    const badgeBackground =
        rawScore >= 80 ? "#16a34a" : rawScore >= 60 ? "#2563eb" : "#6b7280";

    return (
        <div
            style={{
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "16px",
                marginBottom: "14px",
                background: "var(--card)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 8px 18px rgba(0,0,0,0.06)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <div>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", color: "var(--text)" }}>
                        {job.title}
                    </h3>
                    <p style={{ margin: "0 0 4px 0", color: "var(--text)", fontWeight: "500" }}>
                        {job.companyName}
                    </p>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px" }}>
                        {job.location} {job.workMode ? `• ${job.workMode}` : ""}
                    </p>
                </div>

                {showScore && rawScore !== null && (
                    <div
                        style={{
                            background: badgeBackground,
                            color: "white",
                            padding: "8px 12px",
                            borderRadius: "999px",
                            fontWeight: "bold",
                            fontSize: "13px",
                            height: "fit-content",
                            whiteSpace: "nowrap",
                        }}
                    >
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
        <div
            style={{
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "16px",
                marginBottom: "14px",
                background: "var(--card)",
            }}
        >
            <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", color: "var(--text)" }}>
                {job.title}
            </h3>
            <p style={{ margin: "0 0 4px 0", color: "var(--text)", fontWeight: "500" }}>
                {job.companyName}
            </p>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px" }}>
                Closes on {formattedDeadline}
            </p>
        </div>
    );
}

const panelStyle = {
    background: "var(--card)",
    borderRadius: "20px",
    padding: "22px",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow)",
};

const panelTitleStyle = {
    margin: 0,
    marginBottom: "18px",
    fontSize: "24px",
    fontWeight: "800",
    color: "var(--text)",
    letterSpacing: "-0.02em",
};

const modernCardStyle = {
    border: "1px solid var(--border)",
    borderRadius: "18px",
    padding: "18px",
    background: "var(--card)",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
    transition: "all 0.18s ease",
};

const jobTitleStyle = {
    margin: 0,
    fontSize: "18px",
    fontWeight: "800",
    lineHeight: 1.25,
    color: "var(--text)",
    letterSpacing: "-0.02em",
};

const metaTextStyle = {
    fontSize: "14px",
    color: "var(--muted)",
    lineHeight: 1.5,
};

const badgeRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "12px",
};

const softBadgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "var(--surface-2, #f8fafc)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontSize: "13px",
    fontWeight: "600",
};

const actionButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "14px",
    padding: "10px 14px",
    borderRadius: "12px",
    background: "rgba(37, 99, 235, 0.12)",
    border: "1px solid rgba(37, 99, 235, 0.28)",
    color: "var(--blue, #2563eb)",
    fontSize: "14px",
    fontWeight: "700",
    textDecoration: "none",
};

const subtleQuestionStyle = {
    marginTop: "12px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "var(--surface-2, #f8fafc)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontSize: "14px",
    lineHeight: 1.5,
};

const primaryButtonStyle = {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "none",
    background: "var(--blue, #2563eb)",
    color: "white",
    fontWeight: "600",
    cursor: "pointer",
};

const secondaryButtonStyle = {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    fontWeight: "600",
    cursor: "pointer",
};
