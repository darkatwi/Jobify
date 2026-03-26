import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, RotateCcw } from "lucide-react";
import { api } from "../api/api";

export default function NotificationsPage() {
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);
    const [successMessage, setSuccessMessage] = useState("");
    const [activeTab, setActiveTab] = useState("active");

    useEffect(() => {
        loadNotifications(activeTab);
    }, [activeTab]);

    async function loadNotifications(tab) {
        try {
            setLoading(true);
            setError("");

            if (tab === "archived") {
                const archivedRes = await api.get("/Notifications/archived");
                const items = Array.isArray(archivedRes.data) ? archivedRes.data : [];
                setNotifications(items);
            } else {
                const [notificationsRes, unreadRes] = await Promise.all([
                    api.get("/Notifications"),
                    api.get("/Notifications/unread-count"),
                ]);

                const items = Array.isArray(notificationsRes.data) ? notificationsRes.data : [];
                setNotifications(items);
                setUnreadCount(unreadRes.data?.unreadCount ?? 0);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to load notifications");
            setNotifications([]);

            if (tab === "active") {
                setUnreadCount(0);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleNotificationClick(notification) {
        try {
            if (activeTab === "active" && !notification.isRead) {
                await api.put(`/Notifications/${notification.id}/read`);

                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === notification.id ? { ...n, isRead: true } : n
                    )
                );

                setUnreadCount((prev) => Math.max(prev - 1, 0));
            }

            if (notification.opportunityId) {
                navigate(`/opportunities/${notification.opportunityId}`);
            }
        } catch (err) {
            console.error("Failed to update notification:", err);
        }
    }

    async function handleArchive(notificationId, isRead) {
        try {
            setError("");
            await api.put(`/Notifications/${notificationId}/archive`);

            setNotifications((prev) =>
                prev.filter((n) => n.id !== notificationId)
            );

            if (!isRead) {
                setUnreadCount((prev) => Math.max(prev - 1, 0));
            }

            setSuccessMessage("Notification archived");

            setTimeout(() => {
                setSuccessMessage("");
            }, 2000);
        } catch (err) {
            console.error("Failed to archive notification:", err);
            setError("Failed to archive notification");
        }
    }

    async function handleUnarchive(notificationId) {
        try {
            setError("");
            await api.put(`/Notifications/${notificationId}/unarchive`);

            setNotifications((prev) =>
                prev.filter((n) => n.id !== notificationId)
            );

            setSuccessMessage("Notification restored");

            setTimeout(() => {
                setSuccessMessage("");
            }, 2000);
        } catch (err) {
            console.error("Failed to unarchive notification:", err);
            setError("Failed to restore notification");
        }
    }

    return (
        <div
            style={{
                padding: "24px",
                background: "var(--bg)",
                minHeight: "100vh",
                color: "var(--text)",
            }}
        >
            {successMessage && (
                <div style={successToastStyle}>
                    ✅ {successMessage}
                </div>
            )}

            <div style={pageHeaderStyle}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800" }}>
                        Notifications
                    </h1>
                    <p style={{ marginTop: "8px", color: "var(--muted)" }}>
                        Stay updated on opportunities and activity relevant to your account.
                    </p>
                </div>

                {activeTab === "active" && (
                    <div style={badgeStyle}>
                        {unreadCount} unread
                    </div>
                )}
            </div>

            <div style={tabsWrapperStyle}>
                <button
                    onClick={() => setActiveTab("active")}
                    style={{
                        ...tabButtonStyle,
                        ...(activeTab === "active" ? activeTabStyle : {}),
                    }}
                >
                    Active
                </button>

                <button
                    onClick={() => setActiveTab("archived")}
                    style={{
                        ...tabButtonStyle,
                        ...(activeTab === "archived" ? activeTabStyle : {}),
                    }}
                >
                    Archived
                </button>
            </div>

            <div style={panelStyle}>
                {loading ? (
                    <p style={{ color: "var(--muted)" }}>Loading notifications...</p>
                ) : error ? (
                    <p style={{ color: "var(--danger, #ef4444)" }}>{error}</p>
                ) : notifications.length === 0 ? (
                    <p style={{ color: "var(--muted)" }}>
                        {activeTab === "archived"
                            ? "No archived notifications."
                            : "No notifications yet."}
                    </p>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            style={{
                                border: notification.isRead
                                    ? "1px solid var(--border)"
                                    : "1px solid rgba(37, 99, 235, 0.25)",
                                borderRadius: "16px",
                                padding: "18px",
                                marginBottom: "14px",
                                background: notification.isRead
                                    ? "var(--card)"
                                    : "rgba(37, 99, 235, 0.06)",
                                cursor: "pointer",
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
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "12px",
                                    alignItems: "start",
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "start",
                                            gap: "12px",
                                        }}
                                    >
                                        <h3
                                            style={{
                                                margin: "0 0 6px 0",
                                                fontSize: "17px",
                                                color: "var(--text)",
                                            }}
                                        >
                                            {notification.title}
                                        </h3>

                                        {activeTab === "active" ? (
                                            <button
                                                title="Archive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleArchive(notification.id, notification.isRead);
                                                }}
                                                style={actionIconButtonStyle}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = "rgba(0,0,0,0.05)";
                                                    e.currentTarget.style.color = "var(--text)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = "transparent";
                                                    e.currentTarget.style.color = "var(--muted)";
                                                }}
                                            >
                                                <Archive size={16} />
                                            </button>
                                        ) : (
                                            <button
                                                title="Restore"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUnarchive(notification.id);
                                                }}
                                                style={actionIconButtonStyle}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = "rgba(0,0,0,0.05)";
                                                    e.currentTarget.style.color = "var(--text)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = "transparent";
                                                    e.currentTarget.style.color = "var(--muted)";
                                                }}
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <p
                                        style={{
                                            margin: 0,
                                            color: "var(--muted)",
                                            fontSize: "14px",
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        {notification.message}
                                    </p>
                                </div>

                                {activeTab === "active" && !notification.isRead && (
                                    <span
                                        style={{
                                            width: "10px",
                                            height: "10px",
                                            borderRadius: "999px",
                                            background: "var(--blue, #2563eb)",
                                            flexShrink: 0,
                                            marginTop: "6px",
                                        }}
                                    />
                                )}
                            </div>

                            <div
                                style={{
                                    marginTop: "10px",
                                    color: "var(--muted)",
                                    fontSize: "12px",
                                }}
                            >
                                {new Date(notification.createdAtUtc).toLocaleString()}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

const pageHeaderStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
    flexWrap: "wrap",
};

const badgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(37, 99, 235, 0.12)",
    border: "1px solid rgba(37, 99, 235, 0.2)",
    color: "var(--blue, #2563eb)",
    fontWeight: "700",
};

const tabsWrapperStyle = {
    display: "flex",
    gap: "10px",
    marginBottom: "18px",
};

const tabButtonStyle = {
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--muted)",
    borderRadius: "999px",
    padding: "8px 14px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
};

const activeTabStyle = {
    background: "rgba(37, 99, 235, 0.12)",
    border: "1px solid rgba(37, 99, 235, 0.2)",
    color: "var(--blue, #2563eb)",
};

const panelStyle = {
    background: "var(--card)",
    borderRadius: "20px",
    padding: "22px",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow)",
};

const actionIconButtonStyle = {
    border: "none",
    background: "transparent",
    color: "var(--muted)",
    borderRadius: "8px",
    padding: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background 0.15s ease, color 0.15s ease",
};

const successToastStyle = {
    position: "fixed",
    top: "20px",
    right: "20px",
    background: "#16a34a",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
    zIndex: 1000,
};