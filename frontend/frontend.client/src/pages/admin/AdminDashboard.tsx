import { useEffect, useState } from "react";
import { Users, Briefcase, Building2, FileText, TrendingUp, UserPlus, Clock, CheckCircle, XCircle } from "lucide-react";


const getActivityIcon = (type: string) => {
  switch (type) {
    case "New Student":
      return { icon: UserPlus, color: "#2563eb", bg: "#dbeafe" };
    case "New Recruiter":
      return { icon: Briefcase, color: "#16a34a", bg: "#dcfce7" };
    case "New Application":
      return { icon: FileText, color: "#9333ea", bg: "#f3e8ff" };
    case "New Opportunity":
      return { icon: Building2, color: "#ea580c", bg: "#ffedd5" };
    default:
      return { icon: Clock, color: "#6b7280", bg: "#f3f4f6" };
  }
};

export default function AdminDashboard() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Dashboard
  const [dashboard, setDashboard] = useState<any>();
  const [loadingDashboard, setLoadingDashboard] = useState(true);


  // Dashboard Fetching
  async function fetchDashboard() {
    try {
      const token = localStorage.getItem("jobify_token");

      const res = await fetch("http://localhost:5159/api/users/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      setDashboard(data);
    
    }
    catch (err) {
      console.error("Error in Fetching Dashboard: ",err);
    }
    finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);


  // Stats
  const stats = [
    {
      title: "Total Students",
      value: dashboard?.totalStudents ?? "--",
      icon: Users,
      iconColor: "#2563eb",
      bgColor: "#dbeafe",
    },
    {
      title: "Total Recruiters",
      value: dashboard?.totalRecruiters ?? "--",
      icon: Briefcase,
      iconColor: "#16a34a",
      bgColor: "#dcfce7",
    },
    {
      title: "Total Companies",
      value: dashboard?.totalCompanies ?? "--",
      icon: Building2,
      iconColor: "#9333ea",
      bgColor: "#f3e8ff",
    },
    {
      title: "Total Applications",
      value: dashboard?.totalApplications ?? "--",
      icon: FileText,
      iconColor: "#ea580c",
      bgColor: "#ffedd5",
    },
  ];

  return (
    <div style={{ padding: "24px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      {/* Blue Gradient Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
          borderRadius: "12px",
          padding: "32px",
          marginBottom: "24px",
          color: "white",
        }}
      >
        <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px" }}>Dashboard</h1>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>Welcome to Jobify Admin Panel</p>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "24px",
          marginBottom: "24px",
        }}
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isHovered = hoveredCard === index;
          return (
            <div
              key={stat.title}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: isHovered
                  ? "0 10px 25px rgba(0, 0, 0, 0.15)"
                  : "0 2px 8px rgba(0, 0, 0, 0.08)",
                transition: "all 0.3s ease",
                transform: isHovered ? "translateY(-4px)" : "translateY(0)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <span style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>
                  {stat.title}
                </span>
                <div
                  style={{
                    backgroundColor: stat.bgColor,
                    padding: "8px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon style={{ width: "20px", height: "20px", color: stat.iconColor }} />
                </div>
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", marginBottom: "8px" }}>
                {stat.value}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px" }}>
                <TrendingUp style={{ width: "16px", height: "16px", color: "#16a34a" }} />
                <span style={{ color: "#16a34a", fontWeight: "600" }}>+12%</span>
                <span style={{ color: "#6b7280" }}>from last month</span>
              </div>
            </div>
          );
        })}
      </div>
      <div
          style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          marginTop: "24px",
          marginBottom: "24px"
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px" }}>
          System Overview
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          
          {/* Recruiter Status Breakdown */}
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
              Recruiter Status
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Pending Verification</span>
                <span style={{ fontWeight: "600" }}>{dashboard?.pendingVerification ?? "--"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Pending Approval</span>
                <span style={{ fontWeight: "600" }}>{dashboard?.pendingApproval ?? "--"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Verified</span>
                <span style={{ fontWeight: "600" }}>{dashboard?.verifiedRecruiters ?? "--"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Rejected</span>
                <span style={{ fontWeight: "600", color: "#dc2626" }}>{dashboard?.rejectedRecruiters ?? "--"}</span>
              </div>
            </div>
          </div>

          {/* Platform Health */}
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
              Platform Health
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Active Users</span>
                <span style={{ fontWeight: "600" }}>{dashboard?.activeUsers ?? "--"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>New Signups (24h)</span>
                <span style={{ fontWeight: "600" }}>{dashboard?.newSignups ?? "--"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Pending Actions</span>
                <span style={{ fontWeight: "600", color: "#ea580c" }}>{dashboard?.pendingActions ?? "--"}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
      

      {/* Recent Activity */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          marginBottom: "20px"
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px" }}>Recent Activity</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {dashboard?.recentActivity?.map((activity: any, index: number) => {
            const { icon: Icon, color, bg } = getActivityIcon(activity.type);
            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  paddingBottom: "16px",
                  borderBottom: index < dashboard.recentActivity.length - 1 ? "1px solid #e5e7eb" : "none",
                }}
              >
                <div
                  style={{
                    backgroundColor: bg,
                    padding: "10px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon style={{ width: "20px", height: "20px", color: color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: "4px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        backgroundColor: "#f3f4f6",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      {activity.type}
                    </span>
                  </div>
                  <p style={{ fontWeight: "600", marginBottom: "2px", fontSize: "15px" }}>
                    {activity.name}
                  </p>
                  {activity.email && (
                    <p style={{ fontSize: "14px", color: "#6b7280" }}>{activity.email}</p>
                  )}
                  {activity.company && (
                    <p style={{ fontSize: "14px", color: "#6b7280" }}>{activity.company}</p>
                  )}
                  {activity.job && (
                    <p style={{ fontSize: "14px", color: "#6b7280" }}>{activity.job}</p>
                  )}
                </div>
                <span style={{ fontSize: "12px", color: "#9ca3af", flexShrink: 0 }}>
                  {activity.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
