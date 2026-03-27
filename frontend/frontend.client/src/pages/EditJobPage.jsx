import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/api";
import "./styles/organizationdashboard.css";

export default function EditJobPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [requiredInput, setRequiredInput] = useState("");
    const [preferredInput, setPreferredInput] = useState("");

    const [skillsRequired, setSkillsRequired] = useState([]);
    const [skillsPreferred, setSkillsPreferred] = useState([]);

    const [formData, setFormData] = useState({
        title: "",
        companyName: "",
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

    function setField(key, value) {
        setFormData((p) => ({ ...p, [key]: value }));
    }

    function parseLines(value) {
        return value
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean);
    }

    function mapWorkModeFromApi(v) {
        if (v === "Remote") return "remote";
        if (v === "OnSite") return "onsite";
        if (v === "Hybrid") return "hybrid";
        return "";
    }

    function mapEmploymentFromApi(v) {
        if (v === "Internship") return "internship";
        return "fulltime";
    }

    function mapLevelFromApi(v) {
        if (!v) return "";
        return v.toLowerCase();
    }

    function mapToOpportunityType(v) {
        if (v === "internship") return "Internship";
        return "Job";
    }

    function mapToWorkMode(v) {
        if (v === "remote") return "Remote";
        if (v === "onsite") return "OnSite";
        if (v === "hybrid") return "Hybrid";
        return "";
    }

    function mapToExperienceLevel(v, employmentType) {
        if (employmentType === "internship") return "Intern";
        if (v === "entry") return "Entry";
        if (v === "junior") return "Junior";
        if (v === "mid") return "Mid";
        if (v === "senior") return "Senior";
        if (v === "intern") return "Intern";
        return "Entry";
    }

    function addTag(inputValue, setInput, list, setList) {
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

    function removeTag(tag, setList) {
        setList((p) => p.filter((x) => x !== tag));
    }

    useEffect(() => {
        async function loadJob() {
            try {
                const res = await api.get(`/opportunities/${id}`);
                const o = res.data;

                setFormData({
                    title: o.title || "",
                    companyName: o.companyName || "",
                    location: o.location || "",
                    locationName: o.locationName || "",
                    fullAddress: o.fullAddress || "",
                    workType: mapWorkModeFromApi(o.workMode),
                    employmentType: mapEmploymentFromApi(o.type),
                    level: mapLevelFromApi(o.level),
                    description: o.description || "",
                    responsibilitiesText: Array.isArray(o.responsibilities)
                        ? o.responsibilities.join("\n")
                        : "",
                    benefitsPerks: Array.isArray(o.benefits)
                        ? o.benefits.join("\n")
                        : "",
                    deadline: o.deadlineUtc ? o.deadlineUtc.slice(0, 10) : "",
                    latitude: o.latitude != null ? String(o.latitude) : "",
                    longitude: o.longitude != null ? String(o.longitude) : "",
                    minPay: o.minPay != null ? String(o.minPay) : "",
                    maxPay: o.maxPay != null ? String(o.maxPay) : "",
                });

                setSkillsRequired(Array.isArray(o.skills) ? o.skills : []);
                setSkillsPreferred(Array.isArray(o.preferredSkills) ? o.preferredSkills : []);
            } catch (err) {
                console.error(err);
                alert("Failed to load job.");
            } finally {
                setLoading(false);
            }
        }

        loadJob();
    }, [id]);

    async function saveChanges() {
        try {
            setSaving(true);

            const payload = {
                title: formData.title.trim(),
                companyName: formData.companyName.trim(),
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

            await api.put(`/opportunities/${id}`, payload);
            alert("Job updated successfully.");
            navigate("/organization");
        } catch (err) {
            console.error(err);
            alert("Failed to update job.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="orgdash-page"><div className="orgdash-card">Loading job...</div></div>;

    return (
        <div className="orgdash-page">
            <div className="orgdash-card">
                <h2 className="orgdash-section-title">Edit Job Posting</h2>

                <div className="orgdash-form-field">
                    <label>Job Title</label>
                    <input className="orgdash-input" value={formData.title} onChange={(e) => setField("title", e.target.value)} />
                </div>

                <div className="orgdash-grid-2">
                    <div className="orgdash-form-field">
                        <label>Location</label>
                        <input className="orgdash-input" value={formData.location} onChange={(e) => setField("location", e.target.value)} />
                    </div>

                    <div className="orgdash-form-field">
                        <label>Location Name</label>
                        <input className="orgdash-input" value={formData.locationName} onChange={(e) => setField("locationName", e.target.value)} />
                    </div>
                </div>

                <div className="orgdash-form-field">
                    <label>Full Address</label>
                    <input className="orgdash-input" value={formData.fullAddress} onChange={(e) => setField("fullAddress", e.target.value)} />
                </div>

                <div className="orgdash-grid-3">
                    <div className="orgdash-form-field">
                        <label>Work Type</label>
                        <select className="orgdash-input" value={formData.workType} onChange={(e) => setField("workType", e.target.value)}>
                            <option value="">Select</option>
                            <option value="remote">Remote</option>
                            <option value="onsite">On-site</option>
                            <option value="hybrid">Hybrid</option>
                        </select>
                    </div>

                    <div className="orgdash-form-field">
                        <label>Employment Type</label>
                        <select className="orgdash-input" value={formData.employmentType} onChange={(e) => setField("employmentType", e.target.value)}>
                            <option value="">Select</option>
                            <option value="fulltime">Full-time</option>
                            <option value="internship">Internship</option>
                        </select>
                    </div>

                    <div className="orgdash-form-field">
                        <label>Experience Level</label>
                        <select className="orgdash-input" value={formData.level} onChange={(e) => setField("level", e.target.value)}>
                            <option value="">Select</option>
                            <option value="intern">Intern</option>
                            <option value="entry">Entry</option>
                            <option value="junior">Junior</option>
                            <option value="mid">Mid</option>
                            <option value="senior">Senior</option>
                        </select>
                    </div>
                </div>

                <div className="orgdash-form-field">
                    <label>Description</label>
                    <textarea className="orgdash-textarea" value={formData.description} onChange={(e) => setField("description", e.target.value)} />
                </div>

                <div className="orgdash-form-field">
                    <label>Responsibilities</label>
                    <textarea className="orgdash-textarea" value={formData.responsibilitiesText} onChange={(e) => setField("responsibilitiesText", e.target.value)} />
                </div>

                <div className="orgdash-form-field">
                    <label>Benefits</label>
                    <textarea className="orgdash-textarea" value={formData.benefitsPerks} onChange={(e) => setField("benefitsPerks", e.target.value)} />
                </div>

                <div className="orgdash-form-field">
                    <label>Required Skills</label>
                    <div className="orgdash-tags">
                        {skillsRequired.map((s) => (
                            <span key={s} className="orgdash-pill">
                                {s}
                                <button type="button" className="orgdash-pill-x" onClick={() => removeTag(s, setSkillsRequired)}>×</button>
                            </span>
                        ))}
                    </div>
                    <div className="orgdash-tag-input-row">
                        <input
                            className="orgdash-input"
                            value={requiredInput}
                            onChange={(e) => setRequiredInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addTag(requiredInput, setRequiredInput, skillsRequired, setSkillsRequired);
                                }
                            }}
                        />
                        <button type="button" className="orgdash-btn orgdash-btn-outline" onClick={() => addTag(requiredInput, setRequiredInput, skillsRequired, setSkillsRequired)}>
                            Add
                        </button>
                    </div>
                </div>

                <div className="orgdash-form-field">
                    <label>Preferred Skills</label>
                    <div className="orgdash-tags">
                        {skillsPreferred.map((s) => (
                            <span key={s} className="orgdash-pill-alt">
                                {s}
                                <button type="button" className="orgdash-pill-x orgdash-pill-x-alt" onClick={() => removeTag(s, setSkillsPreferred)}>×</button>
                            </span>
                        ))}
                    </div>
                    <div className="orgdash-tag-input-row">
                        <input
                            className="orgdash-input"
                            value={preferredInput}
                            onChange={(e) => setPreferredInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addTag(preferredInput, setPreferredInput, skillsPreferred, setSkillsPreferred);
                                }
                            }}
                        />
                        <button type="button" className="orgdash-btn orgdash-btn-outline" onClick={() => addTag(preferredInput, setPreferredInput, skillsPreferred, setSkillsPreferred)}>
                            Add
                        </button>
                    </div>
                </div>

                <div className="orgdash-grid-2">
                    <input className="orgdash-input" placeholder="Latitude" value={formData.latitude} onChange={(e) => setField("latitude", e.target.value)} />
                    <input className="orgdash-input" placeholder="Longitude" value={formData.longitude} onChange={(e) => setField("longitude", e.target.value)} />
                </div>

                <div className="orgdash-grid-2">
                    <input className="orgdash-input" placeholder="Min Pay" value={formData.minPay} onChange={(e) => setField("minPay", e.target.value)} />
                    <input className="orgdash-input" placeholder="Max Pay" value={formData.maxPay} onChange={(e) => setField("maxPay", e.target.value)} />
                </div>

                <div className="orgdash-form-field">
                    <label>Deadline</label>
                    <input type="date" className="orgdash-input" value={formData.deadline} onChange={(e) => setField("deadline", e.target.value)} />
                </div>

                <div className="orgdash-actions">
                    <button className="orgdash-btn orgdash-btn-primary" onClick={saveChanges} disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
