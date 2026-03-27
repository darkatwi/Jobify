import { useEffect, useState } from "react";
import { Building2, Users, Eye, Search } from "lucide-react";

type Company = {
    id: string;
    name: string;
    email: string;
    website?: string;
    linkedin?: string;
    instagram?: string;
    recruiterCount: number;
    status: string;
    recruiters: {
        id: string;
        email: string;
        joinedAt: string;
        status: string;
    }[];
};

export default function AdminCompanies() {
    const API_URL = import.meta.env.VITE_API_URL;

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [showRecruiters, setShowRecruiters] = useState(false);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);

    async function fetchCompanies() {
        try {
            setLoadingCompanies(true);

            const token = localStorage.getItem("jobify_token");

            const res = await fetch(`${API_URL}/users/companies`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json();
            setCompanies(data);
        } catch (err) {
            console.error("Error in Fetching Companies: ", err);
        } finally {
            setLoadingCompanies(false);
        }
    }

    useEffect(() => {
        fetchCompanies();
    }, []);

    const filteredCompanies = companies.filter((company) =>
        company.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getLogo = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("");
    };

    if (loadingCompanies) {
        return (
            <div style={{ padding: "24px" }}>
                <p>Loading companies...</p>
            </div>
        );
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
                    Companies
                </h1>
                <p style={{ fontSize: "16px", opacity: 0.9 }}>
                    Manage companies and their recruiters
                </p>
            </div>

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
                    placeholder="Search companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "10px 12px 10px 40px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        outline: "none",
                        backgroundColor: "white",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                />
            </div>

            {filteredCompanies.length === 0 ? (
                <div
                    style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "48px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        textAlign: "center",
                    }}
                >
                    <Building2
                        style={{
                            width: "48px",
                            height: "48px",
                            color: "#d1d5db",
                            margin: "0 auto 16px",
                        }}
                    />
                    <p style={{ color: "#9ca3af", fontSize: "14px" }}>No companies found</p>
                </div>
            ) : (
                <div className="admin-companies-grid">
                    {filteredCompanies.map((company) => {
                        const isHovered = hoveredCard === company.id;

                        return (
                            <div
                                key={company.id}
                                onMouseEnter={() => setHoveredCard(company.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                                className="admin-company-card"
                                style={{
                                    boxShadow: isHovered
                                        ? "0 10px 25px rgba(0, 0, 0, 0.15)"
                                        : "0 2px 8px rgba(0, 0, 0, 0.08)",
                                    transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                                }}
                            >
                                <div className="admin-company-top">
                                    <div className="admin-company-logo">{getLogo(company.name)}</div>

                                    <div className="admin-company-main">
                                        <h3 className="admin-company-name">{company.name}</h3>

                                        <span className="admin-company-count">
                                            <Users style={{ width: "12px", height: "12px" }} />
                                            {company.recruiterCount}{" "}
                                            {company.recruiterCount === 1 ? "Recruiter" : "Recruiters"}
                                        </span>

                                        <span
                                            className="admin-company-status"
                                            style={{
                                                backgroundColor:
                                                    company.status === "Verified"
                                                        ? "#dcfce7"
                                                        : company.status === "Pending"
                                                            ? "#fef3c7"
                                                            : "#fee2e2",
                                                color:
                                                    company.status === "Verified"
                                                        ? "#166534"
                                                        : company.status === "Pending"
                                                            ? "#92400e"
                                                            : "#991b1b",
                                            }}
                                        >
                                            {company.status}
                                        </span>
                                    </div>
                                </div>

                                <p className="admin-company-email">{company.email}</p>

                                <div className="admin-company-links">
                                    {company.website && (
                                        <a href={company.website} target="_blank" rel="noreferrer">
                                            🌐
                                        </a>
                                    )}
                                    {company.linkedin && (
                                        <a href={company.linkedin} target="_blank" rel="noreferrer">
                                            💼
                                        </a>
                                    )}
                                    {company.instagram && (
                                        <a href={company.instagram} target="_blank" rel="noreferrer">
                                            📷
                                        </a>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        setSelectedCompany(company);
                                        setShowRecruiters(true);
                                    }}
                                    className="admin-company-btn"
                                >
                                    <Eye style={{ width: "16px", height: "16px" }} />
                                    View Recruiters
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {showRecruiters && selectedCompany && (
                <div
                    className="admin-company-modal-overlay"
                    onClick={() => setShowRecruiters(false)}
                >
                    <div
                        className="admin-company-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-company-modal-header">
                            <div className="admin-company-modal-brand">
                                <div className="admin-company-modal-logo">
                                    {getLogo(selectedCompany.name)}
                                </div>

                                <div style={{ minWidth: 0 }}>
                                    <h2 className="admin-company-modal-title">
                                        {selectedCompany.name}
                                    </h2>
                                    <p className="admin-company-modal-subtitle">
                                        {selectedCompany.recruiterCount}{" "}
                                        {selectedCompany.recruiterCount === 1
                                            ? "Recruiter"
                                            : "Recruiters"}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowRecruiters(false)}
                                className="admin-company-modal-close"
                            >
                                Close
                            </button>
                        </div>

                        {selectedCompany.recruiters.length === 0 ? (
                            <div className="admin-company-empty">No recruiters found</div>
                        ) : (
                            <div className="admin-company-table-wrap">
                                <table className="admin-company-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Joined At</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedCompany.recruiters.map((recruiter, index) => {
                                            const initials =
                                                recruiter.email?.charAt(0).toUpperCase() || "?";

                                            return (
                                                <tr key={recruiter.id}>
                                                    <td
                                                        style={{
                                                            borderTop:
                                                                index > 0
                                                                    ? "1px solid #f3f4f6"
                                                                    : "none",
                                                        }}
                                                    >
                                                        <div className="admin-company-recruiter-cell">
                                                            <div className="admin-company-recruiter-avatar">
                                                                {initials}
                                                            </div>

                                                            <div className="admin-company-recruiter-info">
                                                                <span className="admin-company-recruiter-name">
                                                                    {recruiter.email.split("@")[0]}
                                                                </span>
                                                                <span className="admin-company-recruiter-email">
                                                                    {recruiter.email}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td
                                                        style={{
                                                            borderTop:
                                                                index > 0
                                                                    ? "1px solid #f3f4f6"
                                                                    : "none",
                                                        }}
                                                        className="admin-company-joined"
                                                    >
                                                        {new Date(
                                                            recruiter.joinedAt
                                                        ).toLocaleDateString()}
                                                    </td>

                                                    <td
                                                        style={{
                                                            borderTop:
                                                                index > 0
                                                                    ? "1px solid #f3f4f6"
                                                                    : "none",
                                                        }}
                                                    >
                                                        <span
                                                            className="admin-company-recruiter-status"
                                                            style={{
                                                                backgroundColor:
                                                                    recruiter.status === "Verified"
                                                                        ? "#dcfce7"
                                                                        : recruiter.status ===
                                                                            "Pending"
                                                                            ? "#fef3c7"
                                                                            : "#fee2e2",
                                                                color:
                                                                    recruiter.status === "Verified"
                                                                        ? "#166534"
                                                                        : recruiter.status ===
                                                                            "Pending"
                                                                            ? "#92400e"
                                                                            : "#991b1b",
                                                            }}
                                                        >
                                                            {recruiter.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
