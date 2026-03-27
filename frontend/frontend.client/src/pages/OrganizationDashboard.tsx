import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    Briefcase,
    MapPin,
    Calendar,
    Plus,
    X,
    Gift,
    Compass,
    RotateCcw,
    XCircle,
    Pencil,
    ListChecks,
    DollarSign,
    Building2,
    Trash2
} from "lucide-react";
import { api } from "../api/api";
import "./styles/organizationdashboard.css";

type Tab = "post" | "listings";
type JobStatus = "active" | "draft" | "closed";

type Listing = {
    id: number;
    title: string;
    status: JobStatus;
    postedDate: string;
    deadline: string;
    applicants: number;
    location: string;
    type: string;
    workMode: string;
    level: string;
    description: string;
    benefitsPerks: string;
    responsibilities: string[];
    skillsRequired: string[];
    skillsPreferred: string[];
    latitude: string;
    longitude: string;
    minPay: string;
    maxPay: string;

    assessmentMcqCount: number;
    assessmentChallengeCount: number;
    assessmentTimeLimitSeconds: number;
};

function fmtDate(dateStr: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString();
}

function mapEmployment(v: string) {
    if (v === "fulltime") return "Full-time";
    if (v === "parttime") return "Part-time";
    if (v === "contract") return "Contract";
    if (v === "internship") return "Internship";
    return "—";
}

function mapWorkType(v: string) {
    if (v === "remote") return "Remote";
    if (v === "onsite") return "On-site";
    if (v === "hybrid") return "Hybrid";
    return "—";
}

function mapLevel(v: string) {
    if (v === "intern") return "Intern";
    if (v === "entry") return "Entry";
    if (v === "junior") return "Junior";
    if (v === "mid") return "Mid";
    if (v === "senior") return "Senior";
    return "—";
}

function mapToOpportunityType(v: string) {
    if (v === "internship") return "Internship";
    return "Job";
}

function mapToWorkMode(v: string) {
    if (v === "remote") return "Remote";
    if (v === "onsite") return "OnSite";
    if (v === "hybrid") return "Hybrid";
    return "";
}

function mapToExperienceLevel(v: string, employmentType: string) {
    if (employmentType === "internship") return "Intern";
    if (v === "intern") return "Intern";
    if (v === "entry") return "Entry";
    if (v === "junior") return "Junior";
    if (v === "mid") return "Mid";
    if (v === "senior") return "Senior";
    return "Entry";
}

function parseLines(value: string) {
    return value
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
}

export default function OrganizationDashboard() {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<Tab>("post");

    const [companyName, setCompanyName] = useState("");
    const [userRole, setUserRole] = useState("");
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState("");

    const [listings, setListings] = useState<Listing[]>([]);
    const [loadingListings, setLoadingListings] = useState(false);
    const [listingsError, setListingsError] = useState("");

    const [skillsRequired, setSkillsRequired] = useState<string[]>([]);
    const [requiredInput, setRequiredInput] = useState("");

    const [skillsPreferred, setSkillsPreferred] = useState<string[]>([]);
    const [preferredInput, setPreferredInput] = useState("");

    const [formData, setFormData] = useState({
        title: "",
        location: "",
        locationName: "",
        fullAddress: "",
        workType: "",
        employmentType: "",
        level: "",
        description: "",
        responsibilitiesText: "",
        benefitsPerks: "",
        deadline: "",
        latitude: "",
        longitude: "",
        minPay: "",
        maxPay: "",
    });

    const count = useMemo(() => listings.length, [listings]);

    async function fetchProfile() {
        try {
            setLoadingProfile(true);
            setProfileError("");

            const res = await api.get("/profile");
            const data = res.data;

            setUserRole(data.role || "");

            if (data.role !== "Recruiter") {
                navigate("/dashboard", { replace: true });
                return;
            }

            setCompanyName(data.profile?.companyName || "");
        } catch (err: any) {
            console.error("Profile fetch failed", err);
            setProfileError(err?.response?.data || err?.message || "Failed to load profile.");
        } finally {
            setLoadingProfile(false);
        }
    }

    async function fetchListings() {
        if (!companyName) return;

        try {
            setLoadingListings(true);
            setListingsError("");

            const res = await api.get("/opportunities/my");
            const data = res.data;

            const mapped: Listing[] = data.map((o: any) => ({
                id: o.id,
                title: o.title,
                status: o.isClosed ? "closed" : "active",
                postedDate: o.createdAtUtc ? o.createdAtUtc.slice(0, 10) : "",
                deadline: o.deadlineUtc ? o.deadlineUtc.slice(0, 10) : "",
                applicants: o.applicantCount ?? 0,
                location: o.locationName || o.fullAddress || o.location || "—",
                type: String(o.type ?? ""),
                workMode: String(o.workMode ?? ""),
                level: String(o.level ?? ""),
                description: o.description || "",
                benefitsPerks: Array.isArray(o.benefits) ? o.benefits.join(", ") : "",
                responsibilities: Array.isArray(o.responsibilities) ? o.responsibilities : [],
                skillsRequired: Array.isArray(o.skills) ? o.skills : [],
                skillsPreferred: Array.isArray(o.preferredSkills) ? o.preferredSkills : [],
                latitude: o.latitude != null ? o.latitude.toString() : "",
                longitude: o.longitude != null ? o.longitude.toString() : "",
                minPay: o.minPay != null ? o.minPay.toString() : "",
                maxPay: o.maxPay != null ? o.maxPay.toString() : "",

                assessmentMcqCount: o.assessmentMcqCount ?? 0,
                assessmentChallengeCount: o.assessmentChallengeCount ?? 0,
                assessmentTimeLimitSeconds: o.assessmentTimeLimitSeconds ?? 0,
            }));

            setListings(mapped);
        } catch (err: any) {
            setListingsError(err?.response?.data || err?.message || "Failed to fetch recruiter listings.");
        } finally {
            setLoadingListings(false);
        }
    }

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (companyName) fetchListings();
    }, [companyName]);

    function setField<K extends keyof typeof formData>(k: K, v: string) {
        setFormData((p) => ({ ...p, [k]: v }));
    }

    function addTag(
        inputValue: string,
        setInput: (v: string) => void,
        list: string[],
        setList: React.Dispatch<React.SetStateAction<string[]>>
    ) {
        const s = inputValue.trim();
        if (!s) return;

        const exists = list.some((x) => x.toLowerCase() === s.toLowerCase());
        if (exists) {
            setInput("");
            return;
        }

        setList((p) => [...p, s]);
        setInput("");
    }

    function removeTag(tag: string, setList: React.Dispatch<React.SetStateAction<string[]>>) {
        setList((p) => p.filter((x) => x !== tag));
    }

    function resetForm() {
        setFormData({
            title: "",
            location: "",
            locationName: "",
            fullAddress: "",
            workType: "",
            employmentType: "",
            level: "",
            description: "",
            responsibilitiesText: "",
            benefitsPerks: "",
            deadline: "",
            latitude: "",
            longitude: "",
            minPay: "",
            maxPay: "",
        });
        setSkillsRequired([]);
        setSkillsPreferred([]);
        setRequiredInput("");
        setPreferredInput("");
    }

    function validateStrict(): string | null {
        if (!formData.title.trim()) return "Please enter a job title.";
        if (!formData.location.trim()) return "Please enter a location.";
        if (!formData.workType) return "Please select work type.";
        if (!formData.employmentType) return "Please select employment type.";
        if (!formData.level && formData.employmentType !== "internship") return "Please select experience level.";
        if (!formData.description.trim()) return "Please enter a description.";
        if (!formData.deadline) return "Please pick a deadline.";
        if (skillsRequired.length === 0) return "Please add at least 1 required skill.";

        const hasLat = formData.latitude.trim() !== "";
        const hasLng = formData.longitude.trim() !== "";

        if (hasLat !== hasLng) return "Please enter both latitude and longitude, or leave both empty.";

        if (hasLat && Number.isNaN(Number(formData.latitude))) return "Latitude must be a valid number.";
        if (hasLng && Number.isNaN(Number(formData.longitude))) return "Longitude must be a valid number.";

        if (formData.minPay && Number.isNaN(Number(formData.minPay))) return "Minimum pay must be a valid number.";
        if (formData.maxPay && Number.isNaN(Number(formData.maxPay))) return "Maximum pay must be a valid number.";

        if (
            formData.minPay &&
            formData.maxPay &&
            Number(formData.minPay) > Number(formData.maxPay)
        ) {
            return "Minimum pay cannot be greater than maximum pay.";
        }

        return null;
    }

    async function publish() {
        const err = validateStrict();
        if (err) {
            alert(err);
            return;
        }

        const payload = {
            title: formData.title.trim(),
            companyName,
            location: formData.location.trim() || null,
            locationName: formData.locationName.trim() || null,
            fullAddress: formData.fullAddress.trim() || null,
            type: mapToOpportunityType(formData.employmentType),
            level: mapToExperienceLevel(formData.level, formData.employmentType),
            workMode: mapToWorkMode(formData.workType),
            isRemote: formData.workType === "remote",
            description: formData.description.trim() || null,
            deadlineUtc: formData.deadline ? new Date(formData.deadline).toISOString() : null,
            responsibilities: parseLines(formData.responsibilitiesText),
            skills: skillsRequired,
            preferredSkills: skillsPreferred,
            benefits: parseLines(formData.benefitsPerks),
            latitude: formData.latitude ? Number(formData.latitude) : null,
            longitude: formData.longitude ? Number(formData.longitude) : null,
            minPay: formData.minPay ? Number(formData.minPay) : null,
            maxPay: formData.maxPay ? Number(formData.maxPay) : null,
        };

        try {
            await api.post("/opportunities", payload);
            alert("Opportunity published successfully!");
            await fetchListings();
            resetForm();
            setActiveTab("listings");
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data || err?.message || "Failed to publish opportunity");
        }
    }

    function saveDraft() {
        if (!formData.title.trim()) {
            alert("Draft needs at least a title.");
            return;
        }

        const newJob: Listing = {
            id: Date.now(),
            title: formData.title.trim(),
            status: "draft",
            postedDate: new Date().toISOString().slice(0, 10),
            deadline: formData.deadline || new Date().toISOString().slice(0, 10),
            applicants: 0,
            location: formData.locationName.trim() || formData.fullAddress.trim() || formData.location.trim() || "—",
            type: mapEmployment(formData.employmentType),
            workMode: mapWorkType(formData.workType),
            level: mapLevel(formData.level),
            description: formData.description.trim(),
            benefitsPerks: formData.benefitsPerks.trim(),
            responsibilities: parseLines(formData.responsibilitiesText),
            skillsRequired: [...skillsRequired],
            skillsPreferred: [...skillsPreferred],
            latitude: formData.latitude.trim(),
            longitude: formData.longitude.trim(),
            minPay: formData.minPay.trim(),
            maxPay: formData.maxPay.trim(),

            // 🔥 ADD THIS
            assessmentMcqCount: 0,
            assessmentChallengeCount: 0,
            assessmentTimeLimitSeconds: 0,
        };

        setListings((p) => [newJob, ...p]);
        resetForm();
        setActiveTab("listings");
    }

    async function closeJob(id: number, e?: React.MouseEvent) {
        e?.stopPropagation();
        try {
            await api.patch(`/opportunities/${id}/close`);
            await fetchListings();
        } catch (err: any) {
            alert(err?.response?.data || err?.message || "Failed to close job.");
        }
    }
    async function deleteJob(id, e) {
        e?.stopPropagation();

        const confirmDelete = window.confirm("Are you sure you want to delete this opportunity?");
        if (!confirmDelete) return;

        try {
            await api.delete(`/opportunities/${id}`); 
            await fetchListings(); 
        } catch (err) {
            console.error(err);
            alert("Failed to delete opportunity");
        }
    }

    async function reopenJob(id: number, e?: React.MouseEvent) {
        e?.stopPropagation();
        try {
            await api.patch(`/opportunities/${id}/reopen`);
            await fetchListings();
        } catch (err: any) {
            alert(err?.response?.data || err?.message || "Failed to reopen job.");
        }
    }

    function getBadgeClass(status: JobStatus) {
        if (status === "active") return "orgdash-badge orgdash-badge-active";
        if (status === "draft") return "orgdash-badge orgdash-badge-draft";
        return "orgdash-badge orgdash-badge-closed";
    }

    if (loadingProfile) {
        return (
            <div className="orgdash-page">
                <div className="orgdash-card">Loading organization profile...</div>
            </div>
        );
    }

    if (profileError) {
        return (
            <div className="orgdash-page">
                <div className="orgdash-card">
                    <p className="orgdash-error">{profileError}</p>
                </div>
            </div>
        );
    }

    if (userRole !== "Recruiter") return null;

    return (
        <div className="orgdash-page">
            <div className="orgdash-card">
                <div className="orgdash-header">
                    <div className="orgdash-org">
                        <div className="orgdash-avatar">
                            {(companyName || "R").slice(0, 2).toUpperCase()}
                        </div>

                        <div>
                            <h1 className="orgdash-title">{companyName || "Recruiter Dashboard"}</h1>
                            <p className="orgdash-subtitle">
                                Post jobs • manage listings • close/reopen roles
                            </p>
                        </div>
                    </div>
                </div>

                <div className="orgdash-tabs">
                    <button
                        className={`orgdash-tab ${activeTab === "post" ? "active" : ""}`}
                        onClick={() => setActiveTab("post")}
                    >
                        Post a Job
                    </button>

                    <button
                        className={`orgdash-tab ${activeTab === "listings" ? "active" : ""}`}
                        onClick={() => setActiveTab("listings")}
                    >
                        My Listings ({count})
                    </button>
                </div>
            </div>

            <div className="orgdash-spacer" />

            {activeTab === "post" && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="orgdash-card">
                        <h2 className="orgdash-section-title">
                            <Briefcase size={18} />
                            Create New Job Posting
                        </h2>

                        <div className="orgdash-form-field">
                            <label>Job Title</label>
                            <input
                                className="orgdash-input"
                                placeholder="e.g., Frontend Developer"
                                value={formData.title}
                                onChange={(e) => setField("title", e.target.value)}
                            />
                        </div>

                        <div className="orgdash-grid-3">
                            <div className="orgdash-form-field">
                                <label><MapPin size={14} /> Location</label>
                                <input
                                    className="orgdash-input"
                                    placeholder="e.g., Beirut / Remote"
                                    value={formData.location}
                                    onChange={(e) => setField("location", e.target.value)}
                                />
                            </div>

                            <div className="orgdash-form-field">
                                <label><Building2 size={14} /> Location Name</label>
                                <input
                                    className="orgdash-input"
                                    placeholder="e.g., Beirut Digital District"
                                    value={formData.locationName}
                                    onChange={(e) => setField("locationName", e.target.value)}
                                />
                            </div>

                            <div className="orgdash-form-field">
                                <label>Work Type</label>
                                <select
                                    className="orgdash-input"
                                    value={formData.workType}
                                    onChange={(e) => setField("workType", e.target.value)}
                                >
                                    <option value="">Select</option>
                                    <option value="remote">Remote</option>
                                    <option value="onsite">On-site</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>
                        </div>

                        <div className="orgdash-grid-3">
                            <div className="orgdash-form-field">
                                <label>Employment Type</label>
                                <select
                                    className="orgdash-input"
                                    value={formData.employmentType}
                                    onChange={(e) => setField("employmentType", e.target.value)}
                                >
                                    <option value="">Select</option>
                                    <option value="fulltime">Full-time</option>
                                    <option value="parttime">Part-time</option>
                                    <option value="contract">Contract</option>
                                    <option value="internship">Internship</option>
                                </select>
                            </div>

                            <div className="orgdash-form-field">
                                <label>Experience Level</label>
                                <select
                                    className="orgdash-input"
                                    value={formData.level}
                                    onChange={(e) => setField("level", e.target.value)}
                                    disabled={formData.employmentType === "internship"}
                                >
                                    <option value="">Select</option>
                                    <option value="intern">Intern</option>
                                    <option value="entry">Entry</option>
                                    <option value="junior">Junior</option>
                                    <option value="mid">Mid</option>
                                    <option value="senior">Senior</option>
                                </select>
                            </div>

                            <div className="orgdash-form-field">
                                <label><Calendar size={14} /> Application Deadline</label>
                                <input
                                    className="orgdash-input"
                                    type="date"
                                    value={formData.deadline}
                                    onChange={(e) => setField("deadline", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="orgdash-form-field">
                            <label>Full Address</label>
                            <input
                                className="orgdash-input"
                                placeholder="e.g., BDD 1280, Bashoura, Beirut, Lebanon"
                                value={formData.fullAddress}
                                onChange={(e) => setField("fullAddress", e.target.value)}
                            />
                        </div>

                        <div className="orgdash-form-field">
                            <label>Description</label>
                            <textarea
                                className="orgdash-textarea"
                                placeholder="Describe responsibilities, requirements, and what the role does..."
                                value={formData.description}
                                onChange={(e) => setField("description", e.target.value)}
                            />
                        </div>

                        <div className="orgdash-form-field">
                            <label><ListChecks size={14} /> Responsibilities</label>
                            <textarea
                                className="orgdash-textarea"
                                placeholder={`One item per line
Build frontend screens
Collaborate with backend team
Write reusable components`}
                                value={formData.responsibilitiesText}
                                onChange={(e) => setField("responsibilitiesText", e.target.value)}
                            />
                        </div>

                        <div className="orgdash-form-field">
                            <label><Gift size={14} /> Benefits & Perks</label>
                            <textarea
                                className="orgdash-textarea"
                                placeholder={`One item per line
Health insurance
Flexible hours
Learning budget`}
                                value={formData.benefitsPerks}
                                onChange={(e) => setField("benefitsPerks", e.target.value)}
                            />
                        </div>

                        <div className="orgdash-form-field">
                            <label>Required Skills</label>

                            <div className="orgdash-tags">
                                {skillsRequired.map((s) => (
                                    <span key={s} className="orgdash-pill">
                                        {s}
                                        <button
                                            type="button"
                                            className="orgdash-pill-x"
                                            onClick={() => removeTag(s, setSkillsRequired)}
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            <div className="orgdash-tag-input-row">
                                <input
                                    className="orgdash-input"
                                    placeholder="Add required skill (press Enter)"
                                    value={requiredInput}
                                    onChange={(e) => setRequiredInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addTag(requiredInput, setRequiredInput, skillsRequired, setSkillsRequired);
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    className="orgdash-btn orgdash-btn-outline"
                                    onClick={() => addTag(requiredInput, setRequiredInput, skillsRequired, setSkillsRequired)}
                                >
                                    <Plus size={16} /> Add
                                </button>
                            </div>
                        </div>

                        <div className="orgdash-form-field">
                            <label>Preferred Skills (nice-to-have)</label>

                            <div className="orgdash-tags">
                                {skillsPreferred.map((s) => (
                                    <span key={s} className="orgdash-pill-alt">
                                        {s}
                                        <button
                                            type="button"
                                            className="orgdash-pill-x orgdash-pill-x-alt"
                                            onClick={() => removeTag(s, setSkillsPreferred)}
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            <div className="orgdash-tag-input-row">
                                <input
                                    className="orgdash-input"
                                    placeholder="Add preferred skill (press Enter)"
                                    value={preferredInput}
                                    onChange={(e) => setPreferredInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addTag(preferredInput, setPreferredInput, skillsPreferred, setSkillsPreferred);
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    className="orgdash-btn orgdash-btn-outline"
                                    onClick={() => addTag(preferredInput, setPreferredInput, skillsPreferred, setSkillsPreferred)}
                                >
                                    <Plus size={16} /> Add
                                </button>
                            </div>
                        </div>

                        <div className="orgdash-grid-2">
                            <div className="orgdash-form-field">
                                <label><Compass size={14} /> Latitude</label>
                                <input
                                    className="orgdash-input"
                                    placeholder="e.g., 33.8938"
                                    value={formData.latitude}
                                    onChange={(e) => setField("latitude", e.target.value)}
                                />
                            </div>

                            <div className="orgdash-form-field">
                                <label><Compass size={14} /> Longitude</label>
                                <input
                                    className="orgdash-input"
                                    placeholder="e.g., 35.5018"
                                    value={formData.longitude}
                                    onChange={(e) => setField("longitude", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="orgdash-grid-2">
                            <div className="orgdash-form-field">
                                <label><DollarSign size={14} /> Minimum Pay</label>
                                <input
                                    className="orgdash-input"
                                    placeholder="e.g., 800"
                                    value={formData.minPay}
                                    onChange={(e) => setField("minPay", e.target.value)}
                                />
                            </div>

                            <div className="orgdash-form-field">
                                <label><DollarSign size={14} /> Maximum Pay</label>
                                <input
                                    className="orgdash-input"
                                    placeholder="e.g., 1500"
                                    value={formData.maxPay}
                                    onChange={(e) => setField("maxPay", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="orgdash-actions">
                            <button className="orgdash-btn orgdash-btn-primary" onClick={publish}>
                                Publish Job
                            </button>
                            <button className="orgdash-btn orgdash-btn-outline" onClick={saveDraft}>
                                Save Draft
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {activeTab === "listings" && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="orgdash-spacer" />

                    {loadingListings && <div className="orgdash-card">Loading listings...</div>}
                    {listingsError && <div className="orgdash-card orgdash-error">{listingsError}</div>}

                    <div className="orgdash-listings">
                        {listings.map((job) => (
                            <div
                                key={job.id}
                                className="orgdash-listing-card"
                                onClick={() => navigate(`/applicants?jobId=${job.id}`)}
                            >
                                <div className="orgdash-listing-top">
                                    <div className="orgdash-listing-main">
                                        <div className="orgdash-listing-title">
                                            <Briefcase size={16} />
                                            {job.title}
                                        </div>

                                        <div className="orgdash-listing-meta">
                                            {job.location} • {job.type} • {job.workMode} • {job.level || "—"}
                                        </div>

                                        <div className="orgdash-listing-submeta">
                                            Posted: {fmtDate(job.postedDate)} • Deadline: {fmtDate(job.deadline)} • Applicants:{" "}
                                            <b>{job.applicants}</b>
                                        </div>

                                        <div className="orgdash-listing-desc">
                                            <b>Description:</b> {job.description || "—"}
                                        </div>

                                        <div className="orgdash-listing-desc">
                                            <b>Benefits & Perks:</b> {job.benefitsPerks || "—"}
                                        </div>

                                        <div className="orgdash-listing-desc">
                                            <b>Responsibilities:</b>{" "}
                                            {job.responsibilities.length > 0 ? job.responsibilities.join(" • ") : "—"}
                                        </div>

                                        {/* REQUIRED SKILLS */}
                                        <div className="orgdash-skill-section">
                                            <div className="orgdash-skill-label">Required Skills:</div>

                                            <div className="orgdash-tags">
                                                {job.skillsRequired.length > 0 ? (
                                                    job.skillsRequired.map((s) => (
                                                        <span key={`r-${job.id}-${s}`} className="orgdash-pill">
                                                            {s}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="orgdash-empty">—</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* PREFERRED SKILLS */}
                                        <div className="orgdash-skill-section">
                                            <div className="orgdash-skill-label">Preferred Skills:</div>

                                            <div className="orgdash-tags">
                                                {job.skillsPreferred.length > 0 ? (
                                                    job.skillsPreferred.map((s) => (
                                                        <span key={`p-${job.id}-${s}`} className="orgdash-pill-alt">
                                                            {s}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="orgdash-empty">—</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="orgdash-listing-submeta">
                                            <b>Lat/Long:</b> {job.latitude || "—"}, {job.longitude || "—"}
                                        </div>

                                        <div className="orgdash-listing-submeta">
                                            <b>Pay Range:</b> {job.minPay || "—"} - {job.maxPay || "—"}
                                        </div>
                                        <div className="orgdash-listing-submeta">
                                            <b>Assessment:</b>{" "}
                                            {job.assessmentMcqCount > 0 || job.assessmentChallengeCount > 0
                                                ? `${job.assessmentMcqCount} MCQs • ${job.assessmentChallengeCount} Coding • ${Math.floor((job.assessmentTimeLimitSeconds || 0) / 60)} min`
                                                : "No assessment"}
                                        </div>

                                        <div className="orgdash-applicants-chip">
                                            {job.applicants} Applicants
                                        </div>
                                    </div>

                                    <div className="orgdash-listing-side" onClick={(e) => e.stopPropagation()}>
                                        <span className={getBadgeClass(job.status)}>
                                            {job.status === "active"
                                                ? "Active"
                                                : job.status === "draft"
                                                    ? "Draft"
                                                    : "Closed"}
                                        </span>

                                        <div className="orgdash-listing-side-actions">
                                            <button
                                                type="button"
                                                className="orgdash-action-btn"
                                                onClick={() => navigate(`/edit-job/${job.id}`)}
                                            >
                                                <Pencil size={15} />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="orgdash-action-btn"
                                                onClick={() => navigate(`/opportunities/${job.id}/assessment`)}
                                            >
                                                <ListChecks size={15} />
                                                {job.assessmentMcqCount > 0 || job.assessmentChallengeCount > 0
                                                    ? "Edit Assessment"
                                                    : "Add Assessment"}
                                            </button>

                                            {job.status === "active" && (
                                                <button
                                                    type="button"
                                                    className="orgdash-action-btn orgdash-action-btn-danger"
                                                    onClick={(e) => closeJob(job.id, e)}
                                                >
                                                    <XCircle size={15} />
                                                    Close Role
                                                </button>
                                            )}

                                            {job.status === "closed" && (
                                                <button
                                                    type="button"
                                                    className="orgdash-action-btn orgdash-action-btn-success"
                                                    onClick={(e) => reopenJob(job.id, e)}
                                                >
                                                    <RotateCcw size={15} />
                                                    Reopen Role
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="orgdash-action-btn orgdash-action-btn-danger"
                                                onClick={(e) => deleteJob(job.id, e)}
                                            >
                                                <Trash2 size={15} />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
