import { useEffect, useState } from "react";
import { Eye, FileText, Search } from "lucide-react";


interface Student {
  id: string;
  email: string;
  fullName: string,
  createdAt: string;
  updatedAtUtc?: string;
}

const statusStyles: { [key: string]: { backgroundColor: string; color: string } } = {
  Applied: { backgroundColor: "#dbeafe", color: "#1e40af" },
  Interview: { backgroundColor: "#ffedd5", color: "#c2410c" },
  Accepted: { backgroundColor: "#dcfce7", color: "#166534" },
  Rejected: { backgroundColor: "#fee2e2", color: "#991b1b" },
};

export default function AdminStudents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showApplications, setShowApplications] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Students
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);


  // Fetching Students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);

        const token = localStorage.getItem("jobify_token");
        
        const res = await fetch("http://localhost:5159/api/users/by-role/Student", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        const data = await res.json();

        setStudents(data);
      }
      catch (err) {
        console.log("Error in Fetching Students: ", err);
      }
      finally {
        setLoadingStudents(false);
      }

    };

    fetchStudents();
  }, []);


  // Filtering Students
  const filteredStudents = students.filter(
    (student) =>
      student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("");
  };

  // Loading Students
  if(loadingStudents) {
    return(
      <div style={{ padding: "24px" }}>
        <p>Loading Students...</p>
      </div>
    );
  }

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
        <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px" }}>Students</h1>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>Manage student accounts and view their applications</p>
      </div>

      {/* Student Management Card */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px" }}>Student Management</h2>

        {/* Search Bar */}
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
            placeholder="Search by name, email, or student ID..."
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

        {/* Students Table */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f9fafb" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#6b7280" }}>
                  Student
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#6b7280" }}>
                  Student ID
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#6b7280" }}>
                  Email
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#6b7280" }}>
                  Created At
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#6b7280" }}>
                  Last Updated
                </th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "13px", fontWeight: "600", color: "#6b7280" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
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
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    onMouseEnter={() => setHoveredRow(student.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      backgroundColor: hoveredRow === student.id ? "#f9fafb" : "white",
                      transition: "background-color 0.2s",
                    }}
                  >
                    <td style={{ padding: "16px", borderTop: "1px solid #f3f4f6" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "600",
                            fontSize: "14px",
                          }}
                        >
                          {getInitials(student.fullName)}
                        </div>
                        <span style={{ fontWeight: "600", fontSize: "14px" }}>{student.fullName}</span>
                      </div>
                    </td>
                    <td style={{ padding: "16px", borderTop: "1px solid #f3f4f6" }}>
                      <code
                        style={{
                          backgroundColor: "#f3f4f6",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontFamily: "monospace",
                        }}
                      >
                        {student.id}
                      </code>
                    </td>
                    <td style={{ padding: "16px", borderTop: "1px solid #f3f4f6", color: "#6b7280", fontSize: "14px" }}>
                      {student.email}
                    </td>
                    <td style={{ padding: "16px", borderTop: "1px solid #f3f4f6", color: "#6b7280", fontSize: "14px" }}>
                      {student.createdAt}
                    </td>
                    <td style={{ padding: "16px", borderTop: "1px solid #f3f4f6", color: "#6b7280", fontSize: "14px" }}>
                      {student.updatedAtUtc}
                    </td>
                    <td style={{ padding: "16px", borderTop: "1px solid #f3f4f6", textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                        <button
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "white",
                            color: "#374151",
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
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                        >
                          <Eye style={{ width: "14px", height: "14px" }} />
                          Profile
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowApplications(true);
                          }}
                          style={{
                            padding: "6px 12px",
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
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3b82f6")}
                        >
                          <FileText style={{ width: "14px", height: "14px" }} />
                          Applications
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

      {/* Applications Modal/Overlay */}
      {showApplications && selectedStudent && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowApplications(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "800px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
                  Applications - {selectedStudent.name}
                </h2>
                <p style={{ fontSize: "14px", color: "#6b7280" }}>{selectedStudent.email}</p>
              </div>
              <button
                onClick={() => setShowApplications(false)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e5e7eb")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
              >
                Close
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {selectedStudent.applications.length === 0 ? (
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
                  <div
                    key={index}
                    style={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "20px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>
                          {app.job}
                        </h3>
                        <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>
                          {app.company}
                        </p>
                        <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                          Submitted on {app.date}
                        </p>
                      </div>
                      <span
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          ...statusStyles[app.status],
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
    </div>
  );
}
