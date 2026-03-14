import { useEffect, useState } from "react";
import { getCandidateDashboard } from "../services/dashboardService";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          Welcome back, {data.fullName} 👋
        </h1>

        <p style={{ marginTop: "8px", marginBottom: "16px", opacity: 0.95 }}>
          Your profile is {data.profileCompletionPercentage}% complete.
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
              width: `${data.profileCompletionPercentage}%`,
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
          value={`${data.profileCompletionPercentage}%`}
          icon="👤"
        />
        <StatCard title="Skills Added" value={data.skillsCount} icon="🧠" />
        <StatCard title="Applications" value={data.applicationsCount} icon="📄" />
        <StatCard title="Matches Found" value={data.matchesCount} icon="⭐" />
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

          {data.recommendedOpportunities.length === 0 ? (
            <p style={{ color: "#666" }}>
              No recommendations yet. Complete your profile and add skills.
            </p>
          ) : (
            data.recommendedOpportunities.map((job) => (
              <OpportunityCard key={job.id} job={job} showScore={true} />
            ))
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Quick Actions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <ActionButton text="Browse Jobs" onClick={() => (window.location.href = "/browse")} />
              <ActionButton text="View Matches" onClick={() => (window.location.href = "/matches")} />
              <ActionButton text="Edit Profile" onClick={() => (window.location.href = "/profile")} />
              <ActionButton text="Get Recommendations" onClick={() => (window.location.href = "/match")} />
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Recent Opportunities</h2>
            {data.recentOpportunities.length === 0 ? (
              <p style={{ color: "#666" }}>No opportunities found.</p>
            ) : (
              data.recentOpportunities.map((job) => (
                <OpportunityCard key={job.id} job={job} showScore={false} />
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
  const badgeBackground =
    job.matchScore >= 80 ? "#16a34a" : job.matchScore >= 60 ? "#2563eb" : "#6b7280";

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
            {job.location} • {job.workMode}
          </p>
        </div>

        {showScore && job.matchScore !== null && (
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
            {job.matchScore}% match
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({ text, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 16px",
        borderRadius: "12px",
        border: "none",
        background: "#2563eb",
        color: "white",
        fontWeight: "600",
        cursor: "pointer",
        transition: "transform 0.15s ease, opacity 0.15s ease"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.opacity = "0.95";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.opacity = "1";
      }}
    >
      {text}
    </button>
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
