import { useEffect, useState } from "react";
import { FileText, Search } from "lucide-react";

// Student Interface
const API_URL = import.meta.env.VITE_API_URL;

interface Student {
    id: string;
    email: string;
    fullName: string;
    createdAt: string;
    updatedAtUtc?: string;
}

// Application Interface
interface Application {
    job: string;
    company: string;
    date: string;
    status: string;
}

const formatDateTime = (date?: string) => {
    if (!date) return "-";

    const d = new Date(date);

    return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

const statusStyles: { [key: string]: { backgroundColor: string; color: string } } = {
    Applied: { backgroundColor: "#dbeafe", color: "#1e40af" },
    Pending: { backgroundColor: "#dbeafe", color: "#1e40af" },
    Draft: { backgroundColor: "#f3f4f6", color: "#374151" },
    Shortlisted: { backgroundColor: "#f3e8ff", color: "#6b21a8" },
    Interview: { backgroundColor: "#ffedd5", color: "#c2410c" },
    Accepted: { backgroundColor: "#dcfce7", color: "#166534" },
    Rejected: { backgroundColor: "#fee2e2", color: "#991b1b" },
};

export default function AdminStudents() {
    const [searchQuery, setSearchQuery] = useState("");
    const [students, setStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<(Student & { applications?: Application[] }) | null>(null);

    const [loadingApplications, setLoadingApplications] = useState(false);
    const [showApplications, setShowApplications] = useState(false);

    const [showNotifyModal, setShowNotifyModal] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [notifyTitle, setNotifyTitle] = useState("");
    const [notifyMessage, setNotifyMessage] = useState("");

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                setLoadingStudents(true);

                const token = localStorage.getItem("jobify_token");

                const res = await fetch(`${API_URL}/users/by-role/Student`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                const data = await res.json();
                setStudents(Array.isArray(data) ? data : []);
            } catch (err) {
                console.log("Error in Fetching Students: ", err);
            } finally {
                setLoadingStudents(false);
            }
        };

        fetchStudents();
    }, []);

    const filteredStudents = students.filter((student) => {
        const fullName = student.fullName ?? "";
        const email = student.email ?? "";
        const id = student.id ?? "";

        return (
            fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            id.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const getInitials = (name?: string) => {
        if (!name) return "?";
        return name
            .split(" ")
            .filter(Boolean)
            .map((n) => n[0])
            .join("")
            .slice(0, 2);
    };

    const formatDate = (date?: string) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString(undefined, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
        });
    };

    async function fetchStudentApplications(student: Student) {
        try {
            setLoadingApplications(true);

            const token = localStorage.getItem("jobify_token");

            const res = await fetch(`${API_URL}/application/by-student/${student.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const applications = await res.json();

            setSelectedStudent({
                ...student,
                applications: Array.isArray(applications) ? applications : [],
            });

            setShowApplications(true);
        } catch (err) {
            console.log("Error in fetching applications:", err);
        } finally {
            setLoadingApplications(false);
        }
    }

    const handleSendNotification = async () => {
        if (!selectedStudentId) return;

        if (!notifyMessage.trim()) {
            alert("Message is required");
            return;
        }

        try {
            const token = localStorage.getItem("jobify_token");

            const res = await fetch(`${API_URL}/users/admin/students/${selectedStudentId}/notify`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: notifyTitle,
                    message: notifyMessage,
                }),
            });

            if (!res.ok) throw new Error("Failed");

            alert("Notification sent ✅");
            setShowNotifyModal(false);
            setNotifyTitle("");
            setNotifyMessage("");
        } catch (err) {
            console.error(err);
            alert("Failed to send ❌");
        }
    };

    if (loadingStudents) {
        return (
            <div className="admin-page">
                <div className="admin-students-card">
                    <p>Loading Students...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>Students</h1>
                <p>Manage student accounts and view their applications</p>
            </div>

            <div className="admin-students-card">
                <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "20px" }}>
                    Student Management
                </h2>

                <div className="admin-search-wrap">
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
                        className="admin-search-input"
                        placeholder="Search by name, email, or student ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="admin-students-table-wrap">
                    <div className="admin-students-table-scroll">
                        <table className="admin-students-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Student ID</th>
                                    <th>Email</th>
                                    <th>Created At</th>
                                    <th>Last Updated</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <div className="admin-empty-state">No students found</div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((student) => (
                                        <tr key={student.id} className="admin-students-row">
                                            <td>
                                                <div className="admin-student-cell">
                                                    <div className="admin-student-avatar">
                                                        {getInitials(student.fullName)}
                                                    </div>
                                                    <div className="admin-student-name">
                                                        {student.fullName || "Unnamed Student"}
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <span className="admin-student-id">{student.id}</span>
                                            </td>

                                            <td className="admin-student-email">{student.email}</td>

                                            <td className="admin-student-date">
                                                {formatDate(student.createdAt)}
                                            </td>

                                            <td className="admin-student-date">
                                                {formatDate(student.updatedAtUtc)}
                                            </td>

                                            <td>
                                                <div className="admin-student-actions">
                                                    <button
                                                        className="admin-btn admin-btn-primary"
                                                        onClick={() => fetchStudentApplications(student)}
                                                    >
                                                        <FileText style={{ width: "14px", height: "14px" }} />
                                                        Applications
                                                    </button>

                                                    <button
                                                        className="admin-btn admin-btn-warning"
                                                        onClick={() => {
                                                            setSelectedStudentId(student.id);
                                                            setNotifyTitle("Warning ⚠️");
                                                            setNotifyMessage("");
                                                            setShowNotifyModal(true);
                                                        }}
                                                    >
                                                        Notify
                                                    </button>

                                                    <button className="admin-btn admin-btn-secondary">
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showApplications && selectedStudent && (
                <div
                    className="admin-modal-overlay"
                    onClick={() => setShowApplications(false)}
                >
                    <div
                        className="admin-students-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-students-modal-header">
                            <div>
                                <h2 className="admin-students-modal-title">
                                    Applications - {selectedStudent.fullName}
                                </h2>
                                <p className="admin-students-modal-subtitle">
                                    {selectedStudent.email}
                                </p>
                            </div>

                            <button
                                className="admin-btn admin-btn-secondary"
                                onClick={() => setShowApplications(false)}
                            >
                                Close
                            </button>
                        </div>

                        <div className="admin-students-app-list">
                            {loadingApplications ? (
                                <div className="admin-empty-state">Loading applications...</div>
                            ) : !selectedStudent.applications || selectedStudent.applications.length === 0 ? (
                                <div
                                    style={{
                                        padding: "48px",
                                        textAlign: "center",
                                        color: "#9ca3af",
                                        backgroundColor: "#f9fafb",
                                        borderRadius: "8px",
                                    }}
                                >
                                    No applications yet
                                </div>
                            ) : (
                                selectedStudent.applications.map((app, index) => (
                                    <div key={index} className="admin-students-app-card">
                                        <div className="admin-students-app-top">
                                            <div>
                                                <h3 className="admin-students-app-job">{app.job}</h3>
                                                <p className="admin-students-app-company">{app.company}</p>
                                                <p className="admin-students-app-date">
                                                    Submitted on {formatDateTime(app.date)}
                                                </p>
                                            </div>

                                            <span
                                                className="admin-students-status"
                                                style={statusStyles[app.status] || {
                                                    backgroundColor: "#f3f4f6",
                                                    color: "#374151",
                                                }}
                                            >
                                                {app.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showNotifyModal && (
                <div className="admin-modal-overlay">
                    <div className="admin-notify-modal">
                        <h3 className="admin-notify-title">Send Notification</h3>

                        <input
                            type="text"
                            placeholder="Title"
                            value={notifyTitle}
                            onChange={(e) => setNotifyTitle(e.target.value)}
                            className="admin-notify-input"
                        />

                        <textarea
                            placeholder="Message"
                            value={notifyMessage}
                            onChange={(e) => setNotifyMessage(e.target.value)}
                            className="admin-notify-textarea"
                        />

                        <div className="admin-notify-actions">
                            <button
                                className="admin-btn admin-btn-secondary"
                                onClick={() => setShowNotifyModal(false)}
                            >
                                Cancel
                            </button>

                            <button
                                className="admin-btn admin-btn-primary"
                                onClick={handleSendNotification}
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
