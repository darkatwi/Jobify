import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/api";

export default function NotificationsPage() {
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        async function loadNotifications() {
            try {
                setLoading(true);
                setError("");

                const [notificationsRes, unreadRes] = await Promise.all([
                    api.get("/Notifications"),
                    api.get("/Notifications/unread-count"),
                ]);

                const items = Array.isArray(notificationsRes.data) ? notificationsRes.data : [];
                setNotifications(items);
                setUnreadCount(unreadRes.data?.unreadCount ?? 0);
            } catch (err) {
                console.error(err);
                setError(err.message || "Failed to load notifications");
                setNotifications([]);
                setUnreadCount(0);
            } finally {
                setLoading(false);
            }
        }

        loadNotifications();
    }, []);

    async function handleNotificationClick(notification) {
        try {
            if (!notification.isRead) {
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

    return (
        <div
            style={{
                padding: "24px",
                background: "var(--bg)",
                minHeight: "100vh",
                color: "var(--text)",
            }}
        >
            <div style={pageHeaderStyle}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800" }}>
                        Notifications
                    </h1>
                    <p style={{ marginTop: "8px", color: "var(--muted)" }}>
                        Stay updated on opportunities and activity relevant to your account.
                    </p>
                </div>

                <div style={badgeStyle}>
                    {unreadCount} unread
                </div>
            </div>

            <div style={panelStyle}>
                {loading ? (
                    <p style={{ color: "var(--muted)" }}>Loading notifications...</p>
                ) : error ? (
                    <p style={{ color: "var(--danger, #ef4444)" }}>{error}</p>
                ) : notifications.length === 0 ? (
                    <p style={{ color: "var(--muted)" }}>No notifications yet.</p>
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
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "start" }}>
                                <div>
                                    <h3 style={{ margin: "0 0 6px 0", fontSize: "17px", color: "var(--text)" }}>
                                        {notification.title}
                                    </h3>
                                    <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px", lineHeight: 1.5 }}>
                                        {notification.message}
                                    </p>
                                </div>

                                {!notification.isRead && (
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

                            <div style={{ marginTop: "10px", color: "var(--muted)", fontSize: "12px" }}>
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

const panelStyle = {
    background: "var(--card)",
    borderRadius: "20px",
    padding: "22px",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow)",
};