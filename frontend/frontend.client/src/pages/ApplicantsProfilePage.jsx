import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    BadgeCheck,
    FileText,
    Briefcase,
    GraduationCap,
    MapPin,
    Phone,
    Link as LinkIcon,
} from "lucide-react";
import { api } from "../api/api";
import "./styles/applicantprofile.css";

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function splitTechStack(value) {
    if (!value) return [];
    return String(value)
        .split(/[,\n;]/)
        .map((item) => item.trim())
        .filter(Boolean);
}

export default function ApplicantProfilePage() {
    const { applicationId } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);

    useEffect(() => {
        api.get(`/Application/recruiter/${applicationId}`)
            .then((res) => setData(res.data))
            .catch((err) => console.error(err));
    }, [applicationId]);

    if (!data) {
        return (
            <div className="applicant-profile-page">
                <div className="applicant-profile-container">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }
    const openProtectedFile = async (fileName) => {
        if (!data?.userId || !fileName) return;

        try {
            const res = await api.get("/Application/student-file", {
                params: {
                    userId: data.userId,
                    fileName,
                },
                responseType: "blob",
            });

            const fileUrl = window.URL.createObjectURL(res.data);
            window.open(fileUrl, "_blank", "noopener,noreferrer");
        } catch (err) {
            console.error("Failed to open file:", err);
            alert("Could not open file.");
        }
    };

    const applicantName = data?.fullName || "Applicant";
    const status = data?.status || "Pending";
    const appliedAt = data?.createdAtUtc;
    const assessmentScore = data?.assessmentScore;

    const detectedSkills = Array.isArray(data?.skills) ? data.skills : [];
    const education = Array.isArray(data?.education) ? data.education : [];
    const experience = Array.isArray(data?.experience) ? data.experience : [];
    const projects = Array.isArray(data?.projects) ? data.projects : [];
    const interests = Array.isArray(data?.interests) ? data.interests : [];

    const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "");
    const studentFolder = data?.userId || data?.studentUserId;

    return (
        <div className="applicant-profile-page">
            <div className="applicant-profile-container">
                <button
                    className="applicant-back-btn"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft size={18} />
                    Back
                </button>

                <div className="applicant-hero">
                    <div className="applicant-hero-top">
                        <div>
                            <h1>{applicantName}</h1>
                            <div className="applicant-hero-subtitle">
                                {data?.major || "Applicant profile"}
                            </div>
                        </div>

                        <div className="applicant-status-pill">
                            <BadgeCheck size={16} />
                            {status}
                        </div>
                    </div>

                    <div className="applicant-hero-meta">
                        <span>
                            <Calendar size={16} />
                            Applied {formatDate(appliedAt)}
                        </span>

                        {data?.location ? (
                            <span>
                                <MapPin size={16} />
                                {data.location}
                            </span>
                        ) : null}

                        {data?.phoneNumber ? (
                            <span>
                                <Phone size={16} />
                                {data.phoneNumber}
                            </span>
                        ) : null}

                        {data?.portfolioUrl ? (
                            <a
                                href={data.portfolioUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <LinkIcon size={16} />
                                Portfolio
                            </a>
                        ) : null}
                    </div>

                    <div className="applicant-hero-stats-row">
                        <div className="applicant-hero-stat">
                            <span>Assessment</span>
                            <strong>
                                {assessmentScore != null
                                    ? `${assessmentScore}/100`
                                    : "—"}
                            </strong>
                        </div>

                        <div className="applicant-hero-stat">
                            <span>University</span>
                            <strong>{data?.university || "—"}</strong>
                        </div>
                    </div>
                </div>

                <div className="applicant-sections">
                    <div className="applicant-section">
                        <h3>
                            <FileText size={18} />
                            Summary
                        </h3>
                        <div className="applicant-section-subtitle">
                            Overview of the applicant
                        </div>
                        <p>{data?.bio || "No summary available."}</p>
                    </div>

                    <div className="applicant-section">
                        <h3>
                            <GraduationCap size={18} />
                            Education
                        </h3>
                        <div className="applicant-section-subtitle">
                            Academic background
                        </div>

                        <div className="applicant-entry-list">
                            {education.length > 0 ? (
                                education.map((e, i) => (
                                    <div className="applicant-entry-card" key={i}>
                                        <div className="applicant-entry-card-title">
                                            {e.degree || "Degree"}
                                            {e.major ? ` in ${e.major}` : ""}
                                        </div>

                                        <div className="applicant-entry-card-subtitle">
                                            {e.university || "University"}
                                        </div>

                                        <div className="applicant-entry-card-date">
                                            {e.graduationYear || "—"}
                                        </div>

                                        {e.gpa ? (
                                            <div className="applicant-entry-card-text">
                                                GPA: {e.gpa}
                                            </div>
                                        ) : null}
                                    </div>
                                ))
                            ) : (
                                <p>No education added.</p>
                            )}
                        </div>
                    </div>

                    <div className="applicant-section">
                        <h3>
                            <Briefcase size={18} />
                            Experience
                        </h3>
                        <div className="applicant-section-subtitle">
                            Work and internship history
                        </div>

                        <div className="applicant-entry-list">
                            {experience.length > 0 ? (
                                experience.map((e, i) => (
                                    <div className="applicant-entry-card" key={i}>
                                        <div className="applicant-entry-card-title">
                                            {e.role || "Role"}
                                        </div>

                                        <div className="applicant-entry-card-subtitle">
                                            {e.company || "Company"}
                                        </div>

                                        <div className="applicant-entry-card-date">
                                            {e.duration || "—"}
                                        </div>

                                        <div className="applicant-entry-card-text">
                                            {e.description || "No description."}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>No experience added.</p>
                            )}
                        </div>
                    </div>

                    <div className="applicant-section">
                        <h3>
                            <FileText size={18} />
                            Projects
                        </h3>
                        <div className="applicant-section-subtitle">
                            Technical and personal projects
                        </div>

                        <div className="applicant-entry-list">
                            {projects.length > 0 ? (
                                projects.map((p, i) => (
                                    <div className="applicant-entry-card" key={i}>
                                        <div className="applicant-entry-card-title">
                                            {p.title || "Project"}
                                        </div>

                                        <div className="applicant-entry-card-text">
                                            {p.description || "No description."}
                                        </div>

                                        {splitTechStack(p.techStack).length > 0 ? (
                                            <div className="applicant-tags">
                                                {splitTechStack(p.techStack).map((tag, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="applicant-tag"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}

                                        {p.links ? (
                                            <div className="applicant-entry-card-text">
                                                <a
                                                    href={p.links}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="applicant-link"
                                                >
                                                    View Project Link
                                                </a>
                                            </div>
                                        ) : null}
                                    </div>
                                ))
                            ) : (
                                <p>No projects added.</p>
                            )}
                        </div>
                    </div>

                    <div className="applicant-section">
                        <h3>
                            <BadgeCheck size={18} />
                            Detected Skills
                        </h3>
                        <div className="applicant-section-subtitle">
                            Skills collected from the profile and projects
                        </div>

                        {detectedSkills.length > 0 ? (
                            <div className="applicant-tags">
                                {detectedSkills.map((s, i) => (
                                    <span key={i} className="applicant-tag">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p>No detected skills.</p>
                        )}
                    </div>

                    <div className="applicant-section">
                        <h3>
                            <BadgeCheck size={18} />
                            Interests
                        </h3>
                        <div className="applicant-section-subtitle">
                            Areas the applicant is interested in
                        </div>

                        {interests.length > 0 ? (
                            <div className="applicant-interest-bubbles">
                                {interests.map((interest, idx) => (
                                    <span
                                        key={idx}
                                        className="applicant-interest-bubble"
                                    >
                                        {interest}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p>No interests listed.</p>
                        )}
                    </div>

                    <div className="applicant-section">
                        <h3>
                            <FileText size={18} />
                            Additional Info
                        </h3>
                        <div className="applicant-section-subtitle">
                            Supporting profile details and uploaded documents
                        </div>

                        <div className="applicant-entry-list">
                            <div className="applicant-entry-card">
                                <div className="applicant-entry-card-title">Major</div>
                                <div className="applicant-entry-card-text">
                                    {data?.major || "—"}
                                </div>
                            </div>

                            <div className="applicant-entry-card">
                                <div className="applicant-entry-card-title">
                                    Certifications
                                </div>
                                <div className="applicant-entry-card-text">
                                    {data?.certificationsText || "—"}
                                </div>
                            </div>

                            <div className="applicant-entry-card">
                                <div className="applicant-entry-card-title">Awards</div>
                                <div className="applicant-entry-card-text">
                                    {data?.awardsText || "—"}
                                </div>
                            </div>

                            <div className="applicant-entry-card">
                                <div className="applicant-entry-card-title">Resume</div>
                                <div className="applicant-entry-card-text">
                                    {data?.resumeFileName && studentFolder ? (
                                        <button
                                            type="button"
                                            className="applicant-link-button"
                                            onClick={() => openProtectedFile(data.resumeFileName)}
                                        >
                                            View Resume
                                        </button>
                                    ) : (
                                        "Not uploaded"
                                    )}
                                </div>
                            </div>

                            <div className="applicant-entry-card">
                                <div className="applicant-entry-card-title">University Proof</div>
                                <div className="applicant-entry-card-text">
                                    {data?.universityProofFileName && studentFolder ? (
                                        <button
                                            type="button"
                                            className="applicant-link-button"
                                            onClick={() => openProtectedFile(data.universityProofFileName)}
                                        >
                                            View Proof
                                        </button>
                                    ) : (
                                        "Not uploaded"
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
