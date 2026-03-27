import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Mail, Search } from "lucide-react";

interface Recruiter {
    id: string;
    name: string;
    email: string;
    company: string;
    createdAt: string;
    lastUpdated: string;
    status: "pending_verification" | "pending_approval" | "verified" | "rejected";
}

// Recruiter Status Mapper
function mapStatus(status: string) {
    switch (status) {
        case "EmailPending":
            return "pending_verification";
        case "Pending":
            return "pending_approval";
        case "Verified":
            return "verified";
        case "Rejected":
            return "rejected";
        default:
            return "pending_verification";
    }
}

export default function AdminRecruiters() {
    const API_URL = import.meta.env.VITE_API_URL;

    const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
    const [loadingRecruiters, setLoadingRecruiters] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<
        "pending_verification" | "pending_approval" | "verified" | "rejected"
    >("pending_verification");
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);

    const [showNotifyModal, setShowNotifyModal] = useState(false);
    const [selectedRecruiterId, setSelectedRecruiterId] = useState<string | null>(null);
    const [notifyTitle, setNotifyTitle] = useState("");
    const [notifyMessage, setNotifyMessage] = useState("");
    const [notifyType, setNotifyType] = useState("info");

    async function fetchRecruiters() {
        try {
            setLoadingRecruiters(true);

            const token = localStorage.getItem("jobify_token");

            const res = await fetch(`${API_URL}/users/by-role/recruiter`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json();

            const mapped = data.map((r: any) => ({
                id: r.id,
                name: r.fullName ?? r.email,
                email: r.email,
                company: r.companyName,
                createdAt: r.createdAt.split("T")[0],
                lastUpdated: r.updatedAtUtc
                    ? r.updatedAtUtc.split("T")[0]
                    : r.createdAt.split("T")[0],
                status: mapStatus(r.verificationStatus),
            }));

            setRecruiters(mapped);
        } catch (err) {
            console.error("Error in Fetching Recruiters: ", err);
        } finally {
            setLoadingRecruiters(false);
        }
    }

    useEffect(() => {
        fetchRecruiters();
    }, []);

    const handleApprove = async (recruiterId: string) => {
        try {
            const token = localStorage.getItem("jobify_token");

            await fetch(`${API_URL}/auth/admin/approve-recruiter/${recruiterId}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            fetchRecruiters();
            alert("Recruiter Approved Successfully!");
        } catch (err) {
            console.error("Error in Approving Recruiter: ", err);
        }
    };

    const handleReject = async (recruiterId: string) => {
        try {
            const token = localStorage.getItem("jobify_token");

            await fetch(`${API_URL}/auth/admin/reject-recruiter/${recruiterId}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            fetchRecruiters();
            alert("Recruiter Rejected Successfully.");
        } catch (err) {
            console.error("Error in Rejecting Recruiter: ", err);
        }
    };

    const handleRevoke = async (recruiterId: string) => {
        try {
            const token = localStorage.getItem("jobify_token");

            await fetch(`${API_URL}/auth/admin/recruiters/${recruiterId}/revoke`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            fetchRecruiters();
            alert("Recruiter Rejected Successfully.");
        } catch (err) {
            console.error("Error in Rejecting Recruiter: ", err);
        }
    };

    const handleSendNotification = async () => {
        if (!selectedRecruiterId) return;

        if (!notifyMessage.trim()) {
            alert("Message is required");
            return;
        }

        try {
            const token = localStorage.getItem("jobify_token");

            const res = await fetch(
                `${API_URL}/users/admin/recruiters/${selectedRecruiterId}/notify`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: notifyTitle,
                        message: notifyMessage,
                    }),
                }
            );

            if (!res.ok) throw new Error("Failed");

            alert("Notification sent ✅");

            setShowNotifyModal(false);
            setNotifyTitle("");
            setNotifyMessage("");
            setNotifyType("info");
        } catch (err) {
            console.error(err);
            alert("Failed to send ❌");
        }
    };

    const filteredRecruiters = recruiters.filter((recruiter) => {
        const matchesSearch =
            recruiter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            recruiter.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            recruiter.company.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTab = recruiter.status === activeTab;

        return matchesSearch && matchesTab;
    });

    const pendingVerificationCount = recruiters.filter(
        (r) => r.status === "pending_verification"
    ).length;
    const pendingApprovalCount = recruiters.filter(
        (r) => r.status === "pending_approval"
    ).length;
    const verifiedCount = recruiters.filter((r) => r.status === "verified").length;
    const rejectedCount = recruiters.filter((r) => r.status === "rejected").length;

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("");
    };

    const tabs = [
        {
            value: "pending_verification",
            label: "Waiting for Email",
            icon: Mail,
            count: pendingVerificationCount,
            color: "#ea580c",
        },
        {
            value: "pending_approval",
            label: "Waiting for Approval",
            icon: Clock,
            count: pendingApprovalCount,
            color: "#3b82f6",
        },
        {
            value: "verified",
            label: "Verified",
            icon: CheckCircle,
            count: verifiedCount,
            color: "#16a34a",
        },
        {
            value: "rejected",
            label: "Rejected",
            icon: XCircle,
            count: rejectedCount,
            color: "#dc2626",
        },
    ];

    if (loadingRecruiters) {
        return <p style={{ padding: "24px" }}>Loading recruiters...</p>;
    }

    return (
        <div className="admin-page">
            <div
                style={{
                    background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                    borderRadius: "12px",
                    padding: "32px",
                    marginBottom: "24px",
                    color: "white",
                }}
            >
                <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px" }}>
                    Recruiters
                </h1>
                <p style={{ fontSize: "16px", opacity: 0.9 }}>
                    Manage recruiter accounts and approvals
                </p>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "16px",
                    marginBottom: "24px",
                }}
            >
                <div
                    style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div
                            style={{
                                backgroundColor: "#ffedd5",
                                padding: "12px",
                                borderRadius: "8px",
                            }}
                        >
                            <Mail style={{ width: "24px", height: "24px", color: "#ea580c" }} />
                        </div>
                        <div>
                            <p
                                style={{
                                    fontSize: "13px",
                                    color: "#6b7280",
                                    marginBottom: "4px",
                                }}
                            >
                                Pending Verification
                            </p>
                            <p style={{ fontSize: "28px", fontWeight: "700" }}>
                                {pendingVerificationCount}
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div
                            style={{
                                backgroundColor: "#dbeafe",
                                padding: "12px",
                                borderRadius: "8px",
                            }}
                        >
                            <Clock style={{ width: "24px", height: "24px", color: "#3b82f6" }} />
                        </div>
                        <div>
                            <p
                                style={{
                                    fontSize: "13px",
                                    color: "#6b7280",
                                    marginBottom: "4px",
                                }}
                            >
                                Pending Approval
                            </p>
                            <p style={{ fontSize: "28px", fontWeight: "700" }}>
                                {pendingApprovalCount}
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div
                            style={{
                                backgroundColor: "#dcfce7",
                                padding: "12px",
                                borderRadius: "8px",
                            }}
                        >
                            <CheckCircle
                                style={{ width: "24px", height: "24px", color: "#16a34a" }}
                            />
                        </div>
                        <div>
                            <p
                                style={{
                                    fontSize: "13px",
                                    color: "#6b7280",
                                    marginBottom: "4px",
                                }}
                            >
                                Verified
                            </p>
                            <p style={{ fontSize: "28px", fontWeight: "700" }}>{verifiedCount}</p>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div
                            style={{
                                backgroundColor: "#fee2e2",
                                padding: "12px",
                                borderRadius: "8px",
                            }}
                        >
                            <XCircle style={{ width: "24px", height: "24px", color: "#dc2626" }} />
                        </div>
                        <div>
                            <p
                                style={{
                                    fontSize: "13px",
                                    color: "#6b7280",
                                    marginBottom: "4px",
                                }}
                            >
                                Rejected
                            </p>
                            <p style={{ fontSize: "28px", fontWeight: "700" }}>{rejectedCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    marginTop: "20px",
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: "24px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                }}
            >
                <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px" }}>
                    Recruiter Management
                </h2>

                <div style={{ position: "relative", marginBottom: "24px" }}>
                    <Search
                        style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: "16px",
                            height: "16px",
                            color: "#9ca3af",
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search by name, email, or company..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px 12px 10px 40px",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            fontSize: "14px",
                            outline: "none",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                    />
                </div>

                <div className="admin-recruiter-tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.value;

                        return (
                            <button
                                key={tab.value}
                                onClick={() => setActiveTab(tab.value as typeof activeTab)}
                                className={`admin-recruiter-tab ${isActive ? "active" : ""}`}
                            >
                                <Icon className="admin-recruiter-tab-icon" />
                                <span className="admin-recruiter-tab-label">{tab.label}</span>

                                {tab.count > 0 && (
                                    <span
                                        className={`admin-recruiter-tab-badge ${isActive ? "active" : ""
                                            }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="admin-recruiters-table-wrap">
                    <table className="admin-recruiters-table">
                        <thead>
                            <tr style={{ backgroundColor: "#f9fafb" }}>
                                <th
                                    style={{
                                        padding: "12px 16px",
                                        textAlign: "left",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                    }}
                                >
                                    Recruiter
                                </th>
                                <th
                                    style={{
                                        padding: "12px 16px",
                                        textAlign: "left",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                    }}
                                >
                                    Email
                                </th>
                                <th
                                    style={{
                                        padding: "12px 16px",
                                        textAlign: "left",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                    }}
                                >
                                    Company
                                </th>
                                <th
                                    style={{
                                        padding: "12px 16px",
                                        textAlign: "left",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                    }}
                                >
                                    Created At
                                </th>
                                <th
                                    style={{
                                        padding: "12px 16px",
                                        textAlign: "left",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                    }}
                                >
                                    Last Updated
                                </th>
                                <th
                                    style={{
                                        padding: "12px 16px",
                                        textAlign: "right",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                    }}
                                >
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRecruiters.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        style={{
                                            padding: "48px",
                                            textAlign: "center",
                                            color: "#9ca3af",
                                            fontSize: "14px",
                                        }}
                                    >
                                        No recruiters found
                                    </td>
                                </tr>
                            ) : (
                                filteredRecruiters.map((recruiter) => (
                                    <tr
                                        key={recruiter.id}
                                        onMouseEnter={() => setHoveredRow(recruiter.id)}
                                        onMouseLeave={() => setHoveredRow(null)}
                                        style={{
                                            backgroundColor:
                                                hoveredRow === recruiter.id ? "#f9fafb" : "white",
                                            transition: "background-color 0.2s",
                                        }}
                                    >
                                        <td
                                            style={{
                                                padding: "16px",
                                                borderTop: "1px solid #f3f4f6",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "12px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "40px",
                                                        height: "40px",
                                                        borderRadius: "50%",
                                                        backgroundColor: "#16a34a",
                                                        color: "white",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontWeight: "600",
                                                        fontSize: "14px",
                                                    }}
                                                >
                                                    {getInitials(recruiter.name)}
                                                </div>
                                                <span
                                                    style={{
                                                        fontWeight: "600",
                                                        fontSize: "14px",
                                                    }}
                                                >
                                                    {recruiter.name}
                                                </span>
                                            </div>
                                        </td>

                                        <td
                                            style={{
                                                padding: "16px",
                                                borderTop: "1px solid #f3f4f6",
                                                color: "#6b7280",
                                                fontSize: "14px",
                                            }}
                                        >
                                            {recruiter.email}
                                        </td>

                                        <td
                                            style={{
                                                padding: "16px",
                                                borderTop: "1px solid #f3f4f6",
                                            }}
                                        >
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
                                                {recruiter.company}
                                            </span>
                                        </td>

                                        <td
                                            style={{
                                                padding: "16px",
                                                borderTop: "1px solid #f3f4f6",
                                                color: "#6b7280",
                                                fontSize: "14px",
                                            }}
                                        >
                                            {recruiter.createdAt}
                                        </td>

                                        <td
                                            style={{
                                                padding: "16px",
                                                borderTop: "1px solid #f3f4f6",
                                                color: "#6b7280",
                                                fontSize: "14px",
                                            }}
                                        >
                                            {recruiter.lastUpdated}
                                        </td>

                                        <td
                                            style={{
                                                padding: "16px",
                                                borderTop: "1px solid #f3f4f6",
                                                textAlign: "right",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "flex-end",
                                                    gap: "8px",
                                                }}
                                            >
                                                {activeTab === "pending_verification" && (
                                                    <button
                                                        disabled
                                                        style={{
                                                            padding: "6px 12px",
                                                            backgroundColor: "#f3f4f6",
                                                            color: "#9ca3af",
                                                            border: "1px solid #e5e7eb",
                                                            borderRadius: "6px",
                                                            fontSize: "13px",
                                                            fontWeight: "600",
                                                            cursor: "not-allowed",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "4px",
                                                            opacity: 0.6,
                                                        }}
                                                    >
                                                        <Mail style={{ width: "14px", height: "14px" }} />
                                                        Waiting
                                                    </button>
                                                )}

                                                {activeTab === "pending_approval" && (
                                                    <>
                                                        <button
                                                            onClick={() => handleReject(recruiter.id)}
                                                            style={{
                                                                padding: "6px 12px",
                                                                backgroundColor: "white",
                                                                color: "#dc2626",
                                                                border: "1px solid #d1d5db",
                                                                borderRadius: "6px",
                                                                fontSize: "13px",
                                                                fontWeight: "600",
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "4px",
                                                                transition: "all 0.2s",
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor =
                                                                    "#fee2e2";
                                                                e.currentTarget.style.borderColor =
                                                                    "#dc2626";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor =
                                                                    "white";
                                                                e.currentTarget.style.borderColor =
                                                                    "#d1d5db";
                                                            }}
                                                        >
                                                            <XCircle
                                                                style={{
                                                                    width: "14px",
                                                                    height: "14px",
                                                                }}
                                                            />
                                                            Reject
                                                        </button>

                                                        <button
                                                            onClick={() => handleApprove(recruiter.id)}
                                                            style={{
                                                                padding: "6px 12px",
                                                                backgroundColor: "#16a34a",
                                                                color: "white",
                                                                border: "none",
                                                                borderRadius: "6px",
                                                                fontSize: "13px",
                                                                fontWeight: "600",
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "4px",
                                                                transition: "all 0.2s",
                                                            }}
                                                            onMouseEnter={(e) =>
                                                            (e.currentTarget.style.backgroundColor =
                                                                "#15803d")
                                                            }
                                                            onMouseLeave={(e) =>
                                                            (e.currentTarget.style.backgroundColor =
                                                                "#16a34a")
                                                            }
                                                        >
                                                            <CheckCircle
                                                                style={{
                                                                    width: "14px",
                                                                    height: "14px",
                                                                }}
                                                            />
                                                            Approve
                                                        </button>
                                                    </>
                                                )}

                                                {activeTab === "verified" && (
                                                    <div className="admin-recruiter-actions-stack">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedRecruiterId(recruiter.id);
                                                                setShowNotifyModal(true);
                                                            }}
                                                            style={{
                                                                padding: "6px 15px",
                                                                backgroundColor: "#3b82f6",
                                                                color: "white",
                                                                border: "none",
                                                                borderRadius: "6px",
                                                                fontSize: "13px",
                                                                fontWeight: "600",
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "4px",
                                                                transition: "all 0.2s",
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor =
                                                                    "#2563eb";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor =
                                                                    "#3b82f6";
                                                            }}
                                                        >
                                                            <Mail style={{ width: "16px", height: "14px" }} />
                                                            Notify
                                                        </button>

                                                        <button
                                                            onClick={() => handleRevoke(recruiter.id)}
                                                            style={{
                                                                padding: "6px 12px",
                                                                backgroundColor: "white",
                                                                color: "#dc2626",
                                                                border: "1px solid #d1d5db",
                                                                borderRadius: "6px",
                                                                fontSize: "13px",
                                                                fontWeight: "600",
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "4px",
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor =
                                                                    "#fee2e2";
                                                                e.currentTarget.style.borderColor =
                                                                    "#dc2626";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor =
                                                                    "white";
                                                                e.currentTarget.style.borderColor =
                                                                    "#d1d5db";
                                                            }}
                                                        >
                                                            <XCircle
                                                                style={{
                                                                    width: "14px",
                                                                    height: "14px",
                                                                }}
                                                            />
                                                            Revoke
                                                        </button>
                                                    </div>
                                                )}

                                                {activeTab === "rejected" && (
                                                    <button
                                                        onClick={() => handleApprove(recruiter.id)}
                                                        style={{
                                                            padding: "6px 12px",
                                                            backgroundColor: "#16a34a",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "6px",
                                                            fontSize: "13px",
                                                            fontWeight: "600",
                                                            cursor: "pointer",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "4px",
                                                        }}
                                                    >
                                                        <CheckCircle style={{ width: "14px", height: "14px" }} />
                                                        Re-Approve
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showNotifyModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0,0,0,0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "white",
                            padding: "24px",
                            borderRadius: "12px",
                            width: "400px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                        }}
                    >
                        <h3 style={{ marginBottom: "16px" }}>Send Notification</h3>

                        <select
                            value={notifyType}
                            onChange={(e) => setNotifyType(e.target.value)}
                            style={{
                                width: "100%",
                                marginBottom: "12px",
                                padding: "10px",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                            }}
                        >
                            <option value="info">Info</option>
                            <option value="success">Success</option>
                            <option value="warning">Warning</option>
                        </select>

                        <input
                            type="text"
                            placeholder="Title"
                            value={notifyTitle}
                            onChange={(e) => setNotifyTitle(e.target.value)}
                            style={{
                                width: "100%",
                                marginBottom: "12px",
                                padding: "10px",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                            }}
                        />

                        <textarea
                            placeholder="Message"
                            value={notifyMessage}
                            onChange={(e) => setNotifyMessage(e.target.value)}
                            style={{
                                width: "100%",
                                marginBottom: "16px",
                                padding: "10px",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                                minHeight: "80px",
                            }}
                        />

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: "8px",
                            }}
                        >
                            <button
                                onClick={() => setShowNotifyModal(false)}
                                style={{
                                    padding: "8px 12px",
                                    backgroundColor: "#e5e7eb",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleSendNotification}
                                style={{
                                    padding: "8px 12px",
                                    backgroundColor: "#3b82f6",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                }}
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
