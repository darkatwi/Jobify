import { useState } from "react";
import { Save, User, Lock, Bell, Shield } from "lucide-react";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    name: "Admin User",
    email: "admin@jobify.com",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    emailNotifications: true,
    applicationAlerts: true,
    weeklyReports: false,
    autoApproveRecruiters: false,
    requireEmailVerification: true,
  });

  const handleSave = () => {
    alert("Settings saved successfully");
  };

  const handlePasswordChange = () => {
    if (!settings.currentPassword || !settings.newPassword || !settings.confirmPassword) {
      alert("Please fill in all password fields");
      return;
    }
    if (settings.newPassword !== settings.confirmPassword) {
      alert("New passwords do not match");
      return;
    }
    alert("Password changed successfully");
    setSettings({
      ...settings,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

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
        <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px" }}>Settings</h1>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>Manage your admin account and application settings</p>
      </div>

      {/* Account Settings */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <User style={{ width: "20px", height: "20px", color: "#3b82f6" }} />
          <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Account Settings</h2>
        </div>
        <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "20px" }}>
          Update your personal information
        </p>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
            Full Name
          </label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
            Email Address
          </label>
          <input
            type="email"
            value={settings.email}
            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
          />
        </div>

        <button
          onClick={handleSave}
          style={{
            padding: "10px 20px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3b82f6")}
        >
          <Save style={{ width: "16px", height: "16px" }} />
          Save Changes
        </button>
      </div>

      {/* Password Settings */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <Lock style={{ width: "20px", height: "20px", color: "#3b82f6" }} />
          <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Password</h2>
        </div>
        <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "20px" }}>
          Change your password
        </p>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
            Current Password
          </label>
          <input
            type="password"
            value={settings.currentPassword}
            onChange={(e) => setSettings({ ...settings, currentPassword: e.target.value })}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
            New Password
          </label>
          <input
            type="password"
            value={settings.newPassword}
            onChange={(e) => setSettings({ ...settings, newPassword: e.target.value })}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
            Confirm New Password
          </label>
          <input
            type="password"
            value={settings.confirmPassword}
            onChange={(e) => setSettings({ ...settings, confirmPassword: e.target.value })}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
          />
        </div>

        <button
          onClick={handlePasswordChange}
          style={{
            padding: "10px 20px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3b82f6")}
        >
          <Lock style={{ width: "16px", height: "16px" }} />
          Update Password
        </button>
      </div>

      {/* Notification Settings */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <Bell style={{ width: "20px", height: "20px", color: "#3b82f6" }} />
          <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Notifications</h2>
        </div>
        <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "20px" }}>
          Manage your notification preferences
        </p>

        <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
                Email Notifications
              </p>
              <p style={{ fontSize: "13px", color: "#6b7280" }}>
                Receive email updates about system activity
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, emailNotifications: !settings.emailNotifications })}
              style={{
                width: "44px",
                height: "24px",
                backgroundColor: settings.emailNotifications ? "#3b82f6" : "#d1d5db",
                border: "none",
                borderRadius: "12px",
                position: "relative",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "white",
                  borderRadius: "50%",
                  position: "absolute",
                  top: "2px",
                  left: settings.emailNotifications ? "22px" : "2px",
                  transition: "all 0.2s",
                }}
              />
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
                Application Alerts
              </p>
              <p style={{ fontSize: "13px", color: "#6b7280" }}>
                Get notified when new applications are submitted
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, applicationAlerts: !settings.applicationAlerts })}
              style={{
                width: "44px",
                height: "24px",
                backgroundColor: settings.applicationAlerts ? "#3b82f6" : "#d1d5db",
                border: "none",
                borderRadius: "12px",
                position: "relative",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "white",
                  borderRadius: "50%",
                  position: "absolute",
                  top: "2px",
                  left: settings.applicationAlerts ? "22px" : "2px",
                  transition: "all 0.2s",
                }}
              />
            </button>
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
                Weekly Reports
              </p>
              <p style={{ fontSize: "13px", color: "#6b7280" }}>
                Receive weekly summary reports
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, weeklyReports: !settings.weeklyReports })}
              style={{
                width: "44px",
                height: "24px",
                backgroundColor: settings.weeklyReports ? "#3b82f6" : "#d1d5db",
                border: "none",
                borderRadius: "12px",
                position: "relative",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "white",
                  borderRadius: "50%",
                  position: "absolute",
                  top: "2px",
                  left: settings.weeklyReports ? "22px" : "2px",
                  transition: "all 0.2s",
                }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <Shield style={{ width: "20px", height: "20px", color: "#3b82f6" }} />
          <h2 style={{ fontSize: "20px", fontWeight: "700" }}>System Settings</h2>
        </div>
        <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "20px" }}>
          Configure application behavior
        </p>

        <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
                Auto-Approve Recruiters
              </p>
              <p style={{ fontSize: "13px", color: "#6b7280" }}>
                Automatically verify recruiter accounts
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, autoApproveRecruiters: !settings.autoApproveRecruiters })}
              style={{
                width: "44px",
                height: "24px",
                backgroundColor: settings.autoApproveRecruiters ? "#3b82f6" : "#d1d5db",
                border: "none",
                borderRadius: "12px",
                position: "relative",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "white",
                  borderRadius: "50%",
                  position: "absolute",
                  top: "2px",
                  left: settings.autoApproveRecruiters ? "22px" : "2px",
                  transition: "all 0.2s",
                }}
              />
            </button>
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
                Require Email Verification
              </p>
              <p style={{ fontSize: "13px", color: "#6b7280" }}>
                Users must verify their email before accessing the platform
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, requireEmailVerification: !settings.requireEmailVerification })}
              style={{
                width: "44px",
                height: "24px",
                backgroundColor: settings.requireEmailVerification ? "#3b82f6" : "#d1d5db",
                border: "none",
                borderRadius: "12px",
                position: "relative",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "white",
                  borderRadius: "50%",
                  position: "absolute",
                  top: "2px",
                  left: settings.requireEmailVerification ? "22px" : "2px",
                  transition: "all 0.2s",
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
