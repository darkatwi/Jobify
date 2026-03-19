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
          null;

        if (localName) {
          setCompanyName(localName);
          return;
        }

        const res = await api.get("/api/Profile");
        const data = res.data;

        const apiName = data?.profile?.companyName || "Organization";
        setCompanyName(apiName);
      } catch {
        setCompanyName("Organization");
      }
    }

    loadRecruiterName();
  }, []);

  const stats = [
    { title: "Active Listings", value: "0", icon: "📌" },
    { title: "Applications", value: "0", icon: "📄" },
    { title: "Interviews", value: "0", icon: "🗓️" },
    { title: "Unanswered Q&A", value: "0", icon: "❓" },
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
    <div style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>
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
          <button
            onClick={() => navigate("/organization")}
            style={primaryButtonStyle}
          >
            Go to Organization
          </button>

          <button
                    onClick={() => navigate("/organization/interviews")}
                    style={secondaryButtonStyle}
                        >
                   Interviews
            </button>

          <button
                onClick={() => navigate("/organization/qanda")}
                  style={secondaryButtonStyle}
                    >
                   Q&A
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
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Recruiter Overview</h2>

          <div style={{ display: "grid", gap: "14px" }}>
            {quickActions.map((item) => (
              <div
                key={item.title}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "18px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#111827",
                    marginBottom: "8px",
                  }}
                >
                  {item.title}
                </div>

                <div style={{ color: "#6b7280", marginBottom: "12px" }}>
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
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Upcoming Interviews</h2>
            <p style={{ color: "#666" }}>No interviews scheduled yet.</p>
          </div>

          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Candidate Q&A</h2>
            <p style={{ color: "#666" }}>No candidate questions yet.</p>
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

        const res = await api.get("/api/opportunities/saved");
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
    <div style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #2563eb, #60a5fa)",
          color: "white",
          borderRadius: "20px",
          padding: "28px",
          marginBottom: "28px",
          boxShadow: "0 10px 20px rgba(0,0,0,0.08)"
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
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: `${data?.profileCompletionPercentage ?? 0}%`,
              height: "100%",
              background: "white",
              borderRadius: "999px"
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px"
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
          gridTemplateColumns: "2fr 1fr",
          gap: "20px"
        }}
      >
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Recommended Opportunities</h2>

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
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Saved Opportunities</h2>

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
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "none",
                background: "#2563eb",
                color: "white",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              View All
            </button>
          </div>

          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Upcoming Deadlines</h2>

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
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        transition: "transform 0.15s ease, box-shadow 0.15s ease"
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
        <div style={{ color: "#666", marginBottom: "6px", fontSize: "14px" }}>
          {title}
        </div>
        <div style={{ fontSize: "28px", fontWeight: "bold", color: "#111827" }}>
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
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "16px",
        marginBottom: "14px",
        background: "#fff",
        transition: "transform 0.15s ease, box-shadow 0.15s ease"
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
          <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", color: "#111827" }}>
            {job.title}
          </h3>
          <p style={{ margin: "0 0 4px 0", color: "#555", fontWeight: "500" }}>
            {job.companyName}
          </p>
          <p style={{ margin: 0, color: "#777", fontSize: "14px" }}>
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
              whiteSpace: "nowrap"
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
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "16px",
        marginBottom: "14px",
        background: "#fff"
      }}
    >
      <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", color: "#111827" }}>
        {job.title}
      </h3>
      <p style={{ margin: "0 0 4px 0", color: "#555", fontWeight: "500" }}>
        {job.companyName}
      </p>
      <p style={{ margin: 0, color: "#777", fontSize: "14px" }}>
        Closes on {formattedDeadline}
      </p>
    </div>
  );
}

const sectionStyle = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)"
};

const sectionTitleStyle = {
  marginTop: 0,
  marginBottom: "16px",
  fontSize: "20px",
  color: "#111827"
};

const primaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: "600",
  cursor: "pointer"
};

const secondaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  background: "white",
  color: "#111827",
  fontWeight: "600",
  cursor: "pointer"
};