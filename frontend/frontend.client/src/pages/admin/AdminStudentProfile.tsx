import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Briefcase,
  FileText,
  Award,
  Link as LinkIcon,
  Github,
  Linkedin
} from "lucide-react";

// Mock student data - in a real app, this would come from an API
const studentsData: { [key: string]: any } = {
  "STU001": {
    id: "STU001",
    name: "Sarah Johnson",
    email: "sarah.j@university.edu",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    createdAt: "2025-01-15",
    lastUpdated: "2025-03-10",
    bio: "Computer Science student passionate about full-stack development and machine learning. Looking for internship opportunities to apply my skills in real-world projects.",
    profileImage: null,
    education: {
      university: "University of California, Berkeley",
      degree: "Bachelor of Science in Computer Science",
      graduationYear: "2026",
      gpa: "3.8/4.0",
      major: "Computer Science",
      minor: "Mathematics"
    },
    skills: [
      { name: "JavaScript", level: "Advanced" },
      { name: "React", level: "Advanced" },
      { name: "Python", level: "Intermediate" },
      { name: "Node.js", level: "Intermediate" },
      { name: "SQL", level: "Intermediate" },
      { name: "Git", level: "Advanced" },
      { name: "TypeScript", level: "Intermediate" },
      { name: "AWS", level: "Beginner" },
    ],
    experience: [
      {
        title: "Frontend Developer Intern",
        company: "TechStart Inc.",
        duration: "Jun 2024 - Aug 2024",
        description: "Developed responsive web applications using React and TypeScript. Collaborated with designers to implement pixel-perfect UI components.",
      },
      {
        title: "Teaching Assistant",
        company: "UC Berkeley",
        duration: "Sep 2024 - Present",
        description: "Assisted in CS101 course, conducted lab sessions, and helped students with programming assignments.",
      },
    ],
    applications: [
      { job: "Software Engineer Intern", company: "TechCorp", status: "Interview", date: "2025-03-05" },
      { job: "Data Analyst", company: "DataHub", status: "Applied", date: "2025-03-08" },
      { job: "Frontend Developer", company: "WebSolutions", status: "Rejected", date: "2025-02-20" },
    ],
    socialLinks: {
      github: "github.com/sarahjohnson",
      linkedin: "linkedin.com/in/sarahjohnson",
      portfolio: "sarahjohnson.dev"
    },
    certifications: [
      "AWS Certified Cloud Practitioner",
      "Google Analytics Certification",
      "React Developer Certification"
    ]
  },
  "STU002": {
    id: "STU002",
    name: "Michael Chen",
    email: "m.chen@university.edu",
    phone: "+1 (555) 234-5678",
    location: "Seattle, WA",
    createdAt: "2025-01-20",
    lastUpdated: "2025-03-12",
    bio: "Backend developer with a passion for building scalable systems and microservices architecture.",
    profileImage: null,
    education: {
      university: "University of Washington",
      degree: "Bachelor of Science in Software Engineering",
      graduationYear: "2026",
      gpa: "3.9/4.0",
      major: "Software Engineering",
      minor: "Business Administration"
    },
    skills: [
      { name: "Java", level: "Advanced" },
      { name: "Spring Boot", level: "Advanced" },
      { name: "PostgreSQL", level: "Advanced" },
      { name: "Docker", level: "Intermediate" },
      { name: "Kubernetes", level: "Beginner" },
    ],
    experience: [
      {
        title: "Backend Developer Intern",
        company: "CloudSoft",
        duration: "May 2024 - Aug 2024",
        description: "Built RESTful APIs using Spring Boot and implemented microservices architecture.",
      },
    ],
    applications: [
      { job: "Backend Developer", company: "CloudTech", status: "Accepted", date: "2025-03-01" },
    ],
    socialLinks: {
      github: "github.com/michaelchen",
      linkedin: "linkedin.com/in/michaelchen",
      portfolio: "michaelchen.io"
    },
    certifications: [
      "Oracle Java Certification",
      "Docker Certified Associate"
    ]
  },
  "STU003": {
    id: "STU003",
    name: "Emily Brown",
    email: "emily.b@university.edu",
    phone: "+1 (555) 345-6789",
    location: "New York, NY",
    createdAt: "2025-02-01",
    lastUpdated: "2025-03-14",
    bio: "Creative product designer focused on user-centered design and creating delightful user experiences.",
    profileImage: null,
    education: {
      university: "Parsons School of Design",
      degree: "Bachelor of Fine Arts in Product Design",
      graduationYear: "2026",
      gpa: "3.7/4.0",
      major: "Product Design",
      minor: "Psychology"
    },
    skills: [
      { name: "Figma", level: "Advanced" },
      { name: "Adobe XD", level: "Advanced" },
      { name: "User Research", level: "Intermediate" },
      { name: "Prototyping", level: "Advanced" },
      { name: "HTML/CSS", level: "Intermediate" },
    ],
    experience: [
      {
        title: "UX Design Intern",
        company: "DesignHub",
        duration: "Jun 2024 - Aug 2024",
        description: "Conducted user research and created high-fidelity prototypes for mobile applications.",
      },
    ],
    applications: [
      { job: "Product Designer", company: "DesignCo", status: "Interview", date: "2025-03-10" },
      { job: "UX Researcher", company: "UserLab", status: "Applied", date: "2025-03-12" },
    ],
    socialLinks: {
      linkedin: "linkedin.com/in/emilybrown",
      portfolio: "emilybrown.design"
    },
    certifications: [
      "Google UX Design Certificate",
      "Nielsen Norman Group UX Certification"
    ]
  },
  "STU004": {
    id: "STU004",
    name: "David Miller",
    email: "d.miller@university.edu",
    phone: "+1 (555) 456-7890",
    location: "Austin, TX",
    createdAt: "2025-02-10",
    lastUpdated: "2025-03-15",
    bio: "Marketing enthusiast with a focus on digital marketing and brand strategy.",
    profileImage: null,
    education: {
      university: "University of Texas at Austin",
      degree: "Bachelor of Business Administration",
      graduationYear: "2026",
      gpa: "3.6/4.0",
      major: "Marketing",
      minor: "Communications"
    },
    skills: [
      { name: "Digital Marketing", level: "Advanced" },
      { name: "Social Media", level: "Advanced" },
      { name: "SEO", level: "Intermediate" },
      { name: "Content Creation", level: "Advanced" },
      { name: "Analytics", level: "Intermediate" },
    ],
    experience: [
      {
        title: "Marketing Intern",
        company: "BrandWorks",
        duration: "May 2024 - Jul 2024",
        description: "Managed social media campaigns and created content for brand awareness.",
      },
    ],
    applications: [
      { job: "Marketing Intern", company: "BrandHub", status: "Applied", date: "2025-03-14" },
    ],
    socialLinks: {
      linkedin: "linkedin.com/in/davidmiller",
      portfolio: "davidmiller.co"
    },
    certifications: [
      "Google Digital Marketing Certificate",
      "HubSpot Inbound Marketing"
    ]
  },
  "STU005": {
    id: "STU005",
    name: "Jessica Lee",
    email: "j.lee@university.edu",
    phone: "+1 (555) 567-8901",
    location: "Boston, MA",
    createdAt: "2025-02-15",
    lastUpdated: "2025-03-16",
    bio: "Data science student passionate about machine learning and artificial intelligence applications.",
    profileImage: null,
    education: {
      university: "MIT",
      degree: "Bachelor of Science in Data Science",
      graduationYear: "2026",
      gpa: "4.0/4.0",
      major: "Data Science",
      minor: "Statistics"
    },
    skills: [
      { name: "Python", level: "Advanced" },
      { name: "Machine Learning", level: "Advanced" },
      { name: "TensorFlow", level: "Intermediate" },
      { name: "SQL", level: "Advanced" },
      { name: "R", level: "Intermediate" },
      { name: "Data Visualization", level: "Advanced" },
    ],
    experience: [
      {
        title: "Data Science Intern",
        company: "DataLabs",
        duration: "Jun 2024 - Aug 2024",
        description: "Built predictive models using machine learning algorithms and analyzed large datasets.",
      },
    ],
    applications: [
      { job: "Data Scientist", company: "AI Labs", status: "Interview", date: "2025-03-08" },
      { job: "ML Engineer", company: "DeepTech", status: "Applied", date: "2025-03-15" },
    ],
    socialLinks: {
      github: "github.com/jessicalee",
      linkedin: "linkedin.com/in/jessicalee",
      portfolio: "jessicalee.io"
    },
    certifications: [
      "TensorFlow Developer Certificate",
      "AWS Machine Learning Specialty",
      "Deep Learning Specialization"
    ]
  },
};

const statusStyles: { [key: string]: { backgroundColor: string; color: string } } = {
  Applied: { backgroundColor: "#dbeafe", color: "#1e40af" },
  Interview: { backgroundColor: "#ffedd5", color: "#c2410c" },
  Accepted: { backgroundColor: "#dcfce7", color: "#166534" },
  Rejected: { backgroundColor: "#fee2e2", color: "#991b1b" },
};

const skillLevelStyles: { [key: string]: { backgroundColor: string; color: string } } = {
  Beginner: { backgroundColor: "#fee2e2", color: "#991b1b" },
  Intermediate: { backgroundColor: "#ffedd5", color: "#c2410c" },
  Advanced: { backgroundColor: "#dcfce7", color: "#166534" },
};

export default function AdminStudentProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const student = studentId ? studentsData[studentId] : null;

  if (!student) {
    return (
      <div style={{ padding: "24px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", padding: "48px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#374151", marginBottom: "8px" }}>
            Student Not Found
          </h2>
          <p style={{ color: "#6b7280", marginBottom: "24px" }}>
            The student profile you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/students")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Back to Students
          </button>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("");
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "education", label: "Education" },
    { id: "experience", label: "Experience" },
    { id: "applications", label: "Applications" },
  ];

  return (
    <div style={{ padding: "24px", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      {/* Back Button */}
      <button
        onClick={() => navigate("/students")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          backgroundColor: "white",
          color: "#374151",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "600",
          cursor: "pointer",
          marginBottom: "24px",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
      >
        <ArrowLeft style={{ width: "16px", height: "16px" }} />
        Back to Students
      </button>

      {/* Blue Gradient Header with Profile Info */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
          borderRadius: "12px",
          padding: "32px",
          marginBottom: "24px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", marginBottom: "24px" }}>
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              fontSize: "36px",
              border: "4px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            {getInitials(student.name)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <h1 style={{ fontSize: "32px", fontWeight: "700" }}>{student.name}</h1>
              <code
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontFamily: "monospace",
                }}
              >
                {student.id}
              </code>
            </div>
            <p style={{ fontSize: "16px", opacity: 0.95, marginBottom: "20px" }}>
              {student.bio}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail style={{ width: "16px", height: "16px" }} />
                <span style={{ fontSize: "14px" }}>{student.email}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Phone style={{ width: "16px", height: "16px" }} />
                <span style={{ fontSize: "14px" }}>{student.phone}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MapPin style={{ width: "16px", height: "16px" }} />
                <span style={{ fontSize: "14px" }}>{student.location}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Calendar style={{ width: "16px", height: "16px" }} />
                <span style={{ fontSize: "14px" }}>Joined {student.createdAt}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div style={{ display: "flex", gap: "12px" }}>
          {student.socialLinks.github && (
            <a
              href={`https://${student.socialLinks.github}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)")}
            >
              <Github style={{ width: "16px", height: "16px" }} />
              GitHub
            </a>
          )}
          {student.socialLinks.linkedin && (
            <a
              href={`https://${student.socialLinks.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)")}
            >
              <Linkedin style={{ width: "16px", height: "16px" }} />
              LinkedIn
            </a>
          )}
          {student.socialLinks.portfolio && (
            <a
              href={`https://${student.socialLinks.portfolio}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)")}
            >
              <LinkIcon style={{ width: "16px", height: "16px" }} />
              Portfolio
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "8px",
          marginBottom: "24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          display: "flex",
          gap: "8px",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: "12px 24px",
              backgroundColor: activeTab === tab.id ? "#3b82f6" : "transparent",
              color: activeTab === tab.id ? "white" : "#6b7280",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          {/* Education Card */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div
                style={{
                  backgroundColor: "#dbeafe",
                  padding: "10px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GraduationCap style={{ width: "20px", height: "20px", color: "#2563eb" }} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: "700" }}>Education</h3>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <p style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>
                {student.education.university}
              </p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "2px" }}>
                {student.education.degree}
              </p>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                Class of {student.education.graduationYear} • GPA: {student.education.gpa}
              </p>
            </div>
          </div>

          {/* Skills Card */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div
                style={{
                  backgroundColor: "#f3e8ff",
                  padding: "10px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Award style={{ width: "20px", height: "20px", color: "#9333ea" }} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: "700" }}>Skills</h3>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {student.skills.slice(0, 6).map((skill: any, index: number) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#f3f4f6",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    {skill.name}
                  </div>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "600",
                      textAlign: "center",
                      ...skillLevelStyles[skill.level],
                    }}
                  >
                    {skill.level}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Certifications Card */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div
                style={{
                  backgroundColor: "#dcfce7",
                  padding: "10px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Award style={{ width: "20px", height: "20px", color: "#16a34a" }} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: "700" }}>Certifications</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {student.certifications.map((cert: string, index: number) => (
                <div
                  key={index}
                  style={{
                    padding: "12px",
                    backgroundColor: "#f9fafb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "#374151",
                  }}
                >
                  {cert}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "education" && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "32px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <div
              style={{
                backgroundColor: "#dbeafe",
                padding: "12px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GraduationCap style={{ width: "24px", height: "24px", color: "#2563eb" }} />
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: "700" }}>Educational Background</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
            <div>
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600" }}>
                University
              </p>
              <p style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>
                {student.education.university}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600" }}>
                Degree
              </p>
              <p style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>
                {student.education.degree}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600" }}>
                Major
              </p>
              <p style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>
                {student.education.major}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600" }}>
                Minor
              </p>
              <p style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>
                {student.education.minor}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600" }}>
                Graduation Year
              </p>
              <p style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>
                {student.education.graduationYear}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600" }}>
                GPA
              </p>
              <p style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>
                {student.education.gpa}
              </p>
            </div>
          </div>

          <div style={{ marginTop: "32px", paddingTop: "32px", borderTop: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>Skills & Proficiency</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
              {student.skills.map((skill: any, index: number) => (
                <div
                  key={index}
                  style={{
                    padding: "16px",
                    backgroundColor: "#f9fafb",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      {skill.name}
                    </span>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        ...skillLevelStyles[skill.level],
                      }}
                    >
                      {skill.level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "experience" && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "32px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <div
              style={{
                backgroundColor: "#ffedd5",
                padding: "12px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Briefcase style={{ width: "24px", height: "24px", color: "#ea580c" }} />
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: "700" }}>Work Experience</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {student.experience.map((exp: any, index: number) => (
              <div
                key={index}
                style={{
                  padding: "24px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div style={{ marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#374151", marginBottom: "4px" }}>
                    {exp.title}
                  </h3>
                  <p style={{ fontSize: "16px", color: "#6b7280", marginBottom: "8px" }}>
                    {exp.company}
                  </p>
                  <p style={{ fontSize: "14px", color: "#9ca3af", fontStyle: "italic" }}>
                    {exp.duration}
                  </p>
                </div>
                <p style={{ fontSize: "14px", color: "#374151", lineHeight: "1.6" }}>
                  {exp.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "applications" && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "32px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <div
              style={{
                backgroundColor: "#f3e8ff",
                padding: "12px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText style={{ width: "24px", height: "24px", color: "#9333ea" }} />
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: "700" }}>Job Applications</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {student.applications.length === 0 ? (
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
              student.applications.map((app: any, index: number) => (
                <div
                  key={index}
                  style={{
                    padding: "24px",
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px", color: "#374151" }}>
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
      )}
    </div>
  );
}
