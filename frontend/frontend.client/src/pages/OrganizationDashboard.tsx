import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  MapPin,
  Calendar,
  Users,
  Plus,
  X,
  Gift,
  Compass,
  RotateCcw,
  XCircle,
} from "lucide-react";

type Tab = "post" | "listings" | "applications";
type JobStatus = "active" | "draft" | "closed";

type Listing = {
  id: number;
  title: string;
  status: JobStatus;
  postedDate: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD
  applicants: number;
  location: string;
  type: string;
  workMode: string;

  description: string;
  benefitsPerks: string;

  skillsRequired: string[];
  skillsPreferred: string[];

  latitude: string; // keep as string for inputs
  longitude: string;
};

const API_BASE = "https://localhost:7167/api";

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 20,
    maxWidth: 1150,
    margin: "0 auto",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    color: "#111827",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 18,
    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
  },
  headerRow: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  orgLeft: { display: "flex", gap: 14, alignItems: "center" },
  orgAvatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: "#2563eb",
    display: "grid",
    placeItems: "center",
    color: "white",
    fontWeight: 800,
    fontSize: 18,
  },
  h1: { margin: 0, fontSize: 22, fontWeight: 800 },
  muted: { margin: "6px 0 0 0", color: "#6b7280" },

  tabs: {
    display: "flex",
    gap: 10,
    borderBottom: "1px solid #e5e7eb",
    marginTop: 16,
    marginBottom: 16,
  },
  tabBtn: {
    padding: "10px 12px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 700,
    color: "#6b7280",
    borderBottom: "2px solid transparent",
  },
  tabBtnActive: { color: "#2563eb", borderBottom: "2px solid #2563eb" },

  sectionTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  formGrid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  formGrid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 700, color: "#374151" },

  input: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "10px 12px",
    outline: "none",
    fontSize: 14,
  },
  textarea: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "10px 12px",
    outline: "none",
    fontSize: 14,
    minHeight: 110,
    resize: "vertical",
  },

  row: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid #dbeafe",
  },
  pillAlt: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    background: "#f5f3ff",
    color: "#6d28d9",
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid #ede9fe",
  },
  pillX: {
    width: 18,
    height: 18,
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    display: "grid",
    placeItems: "center",
    lineHeight: "18px",
  },

  actions: {
    display: "flex",
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px solid #e5e7eb",
    flexWrap: "wrap",
  },
  primaryBtn: {
    border: "none",
    background: "#2563eb",
    color: "white",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  outlineBtn: {
    border: "1px solid #d1d5db",
    background: "white",
    color: "#111827",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  dangerBtn: {
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 900,
    cursor: "pointer",
  },
  successBtn: {
    border: "1px solid #a7f3d0",
    background: "#ecfdf5",
    color: "#047857",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 900,
    cursor: "pointer",
  },

  listingCard: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
  },
  listingTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  small: { color: "#6b7280", fontSize: 13 },

  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 12,
    border: "1px solid transparent",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  badgeActive: { background: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0" },
  badgeDraft: { background: "#f3f4f6", color: "#374151", borderColor: "#e5e7eb" },
  badgeClosed: { background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" },

  divider: { height: 12 },
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



export default function OrganizationDashboard() {
  // Tabs
  const [activeTab, setActiveTab] = useState<Tab>("post");

  // Listings
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingsError, setListingsError] = useState("");

  // Applications
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<number | null>(null);

  // Selected Application
  const [selectedApplication, setSelectedApplication] = useState<any | null>(null);
  const [loadingApplicationDetails, setLoadingApplicationDetails] = useState(false);
  const [applicationDetailsError, setApplicationDetailsError] = useState("");

  // Recruiter Notes
  const [recruiterNote, setRecruiterNote] = useState("");
  const [newStatus, setNewStatus] = useState("");

  // Required skills
  const [skillsRequired, setSkillsRequired] = useState<string[]>(["React", "JavaScript"]);
  const [requiredInput, setRequiredInput] = useState("");

  // Preferred skills
  const [skillsPreferred, setSkillsPreferred] = useState<string[]>(["TypeScript"]);
  const [preferredInput, setPreferredInput] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    workType: "",
    employmentType: "",
    description: "",
    benefitsPerks: "",
    deadline: "",
    latitude: "",
    longitude: "",
  });

  // Recruiter listings fetch function
  async function fetchListings() {
    try {
      setLoadingListings(true);
      setListingsError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/opportunities/recruiter`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if(!res.ok) {
        throw new Error("Failed to fetch recruiter listings.");
      }

      const data = await res.json();

      const mapped: Listing[] = data.map((o: any) => ({
        id: o.id,
        title: o.title,
        status: o.isClosed ? "closed" : "active",
        postedDate: o.createdAtUtc ? o.createdAtUtc.slice(0, 10) : "",
        deadline: o.deadlineUtc ? o.deadlineUtc.slice(0, 10) : "",
        applicants: 0,
        location: o.locationName || o.location || "—",
        type: String(o.type ?? ""),
        workMode: String(o.workMode ?? ""),
        description: o.description || "",
        benefitsPerks: o.benefitsJson || "",
        skillsRequired: [],
        skillsPreferred: [],
        latitude: o.latitude?.toString() || "",
        longitude: o.longitude?.toString() || "",
      }));

      setListings(mapped);
    } 
    catch(err: any) {
      setListingsError(err.message || "Something went wrong.");
    } 
    finally {
      setLoadingListings(false);
    }
  }

  // All applications for a selected opportunity fetch function
  async function fetchApplicationsForOpportunity(opportunityId: number) {
    try {
      setLoadingApplications(true);
      setApplicationsError("");
      setSelectedOpportunityId(opportunityId);
      setSelectedApplication(null);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/applications/opportunity/${opportunityId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if(!res.ok) {
        throw new Error("Failed to fetch applications.");
      }

      const data = await res.json();
      setApplications(data);
      setActiveTab("applications");
    }
    catch(err: any) {
      setApplicationsError(err.message || "Something went wrong.");
    } 
    finally {
      setLoadingApplications(false);
    }
  }

  //Single application details fetch function
  async function fetchApplicationDetails(applicationId: number) {
    try {
      setSelectedApplication(null);
      setLoadingApplicationDetails(true);
      setApplicationDetailsError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/applications/${applicationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if(!res.ok) {
        throw new Error("Failed to fetch application details.");
      }

      const data = await res.json();
      setSelectedApplication(data);
      setRecruiterNote(data.note || "");
      setNewStatus(data.status || "");
    }
    catch(err: any) {
      setApplicationDetailsError(err.message || "Something went wrong.");
    }
    finally {
      setLoadingApplicationDetails(false);
    }
  }


  const count = useMemo(() => listings.length, [listings]);

  // Fetch listings when dashboard loads
  useEffect(() => {
    fetchListings();
  }, []);

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
      workType: "",
      employmentType: "",
      description: "",
      benefitsPerks: "",
      deadline: "",
      latitude: "",
      longitude: "",
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
    if (!formData.description.trim()) return "Please enter a description.";
    if (!formData.deadline) return "Please pick a deadline.";
    if (skillsRequired.length === 0) return "Please add at least 1 required skill.";
    return null;
  }

  function publish() {
    const err = validateStrict();
    if (err) {
      alert(err);
      return;
    }

    const newJob: Listing = {
      id: Date.now(),
      title: formData.title.trim(),
      status: "active",
      postedDate: new Date().toISOString().slice(0, 10),
      deadline: formData.deadline,
      applicants: 0,
      location: formData.location.trim(),
      type: mapEmployment(formData.employmentType),
      workMode: mapWorkType(formData.workType),
      description: formData.description.trim(),
      benefitsPerks: formData.benefitsPerks.trim(),
      skillsRequired: [...skillsRequired],
      skillsPreferred: [...skillsPreferred],
      latitude: formData.latitude.trim(),
      longitude: formData.longitude.trim(),
    };

    setListings((p) => [newJob, ...p]);
    resetForm();
    setActiveTab("listings");
    console.log("Publish (frontend-only):", newJob);
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
      location: formData.location.trim() || "—",
      type: mapEmployment(formData.employmentType),
      workMode: mapWorkType(formData.workType),
      description: formData.description.trim(),
      benefitsPerks: formData.benefitsPerks.trim(),
      skillsRequired: [...skillsRequired],
      skillsPreferred: [...skillsPreferred],
      latitude: formData.latitude.trim(),
      longitude: formData.longitude.trim(),
    };

    setListings((p) => [newJob, ...p]);
    resetForm();
    setActiveTab("listings");
    console.log("Draft (frontend-only):", newJob);
  }

  function badgeStyle(s: JobStatus): React.CSSProperties {
    if (s === "active") return { ...styles.badge, ...styles.badgeActive };
    if (s === "draft") return { ...styles.badge, ...styles.badgeDraft };
    return { ...styles.badge, ...styles.badgeClosed };
  }

  function closeJob(id: number) {
    setListings((p) => p.map((j) => (j.id === id ? { ...j, status: "closed" } : j)));
  }

  function reopenJob(id: number) {
    setListings((p) => p.map((j) => (j.id === id ? { ...j, status: "active" } : j)));
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div style={styles.orgLeft}>
            <div style={styles.orgAvatar}>TC</div>
            <div>
              <h1 style={styles.h1}>TechCorp Inc.</h1>
              <p style={styles.muted}>Post jobs • manage listings • close/reopen roles</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={styles.outlineBtn} type="button" onClick={() => setActiveTab("post")}>
              Post a job
            </button>
            <button style={styles.outlineBtn} type="button" onClick={() => setActiveTab("listings")}>
              View listings
            </button>
          </div>
        </div>

        <div style={styles.tabs}>
          <button
            type="button"
            style={{ ...styles.tabBtn, ...(activeTab === "post" ? styles.tabBtnActive : null) }}
            onClick={() => setActiveTab("post")}
          >
            Post a Job
          </button>

          <button
            type="button"
            style={{ ...styles.tabBtn, ...(activeTab === "listings" ? styles.tabBtnActive : null) }}
            onClick={() => setActiveTab("listings")}
          >
            My Listings ({count})
          </button>
        </div>
      </div>

      <div style={styles.divider} />

      {/* POST TAB */}
      {activeTab === "post" && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>
              <Briefcase size={18} />
              Create New Job Posting
            </h2>

            <div style={styles.divider} />

            <div style={styles.field}>
              <label style={styles.label}>Job Title</label>
              <input
                style={styles.input}
                placeholder="e.g., Frontend Developer"
                value={formData.title}
                onChange={(e) => setField("title", e.target.value)}
              />
            </div>

            <div style={styles.divider} />

            <div style={styles.formGrid3}>
              <div style={styles.field}>
                <label style={styles.label}>
                  <MapPin size={14} /> Location
                </label>
                <input
                  style={styles.input}
                  placeholder="e.g., Beirut / Remote"
                  value={formData.location}
                  onChange={(e) => setField("location", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Work Type</label>
                <select style={styles.input} value={formData.workType} onChange={(e) => setField("workType", e.target.value)}>
                  <option value="">Select</option>
                  <option value="remote">Remote</option>
                  <option value="onsite">On-site</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Employment Type</label>
                <select
                  style={styles.input}
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
            </div>

            <div style={styles.divider} />

            <div style={styles.field}>
              <label style={styles.label}>Description</label>
              <textarea
                style={styles.textarea}
                placeholder="Describe responsibilities, requirements, and what the role does..."
                value={formData.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>

            <div style={styles.divider} />

            <div style={styles.field}>
              <label style={styles.label}>
                <Gift size={14} /> Benefits & Perks
              </label>
              <textarea
                style={styles.textarea}
                placeholder="e.g., health insurance, flexible hours, learning budget..."
                value={formData.benefitsPerks}
                onChange={(e) => setField("benefitsPerks", e.target.value)}
              />
            </div>

            <div style={styles.divider} />

            {/* REQUIRED SKILLS */}
            <div style={styles.field}>
              <label style={styles.label}>Required Skills</label>

              <div style={styles.row}>
                {skillsRequired.map((s) => (
                  <span key={s} style={styles.pill}>
                    {s}
                    <button
                      type="button"
                      style={{ ...styles.pillX, background: "#dbeafe", color: "#1d4ed8" }}
                      onClick={() => removeTag(s, setSkillsRequired)}
                      aria-label={`Remove ${s}`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>

              <div style={styles.divider} />

              <div style={styles.row}>
                <input
                  style={{ ...styles.input, flex: 1, minWidth: 240 }}
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
                  style={styles.outlineBtn}
                  onClick={() => addTag(requiredInput, setRequiredInput, skillsRequired, setSkillsRequired)}
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>

            <div style={styles.divider} />

            {/* PREFERRED SKILLS */}
            <div style={styles.field}>
              <label style={styles.label}>Preferred Skills (nice-to-have)</label>

              <div style={styles.row}>
                {skillsPreferred.map((s) => (
                  <span key={s} style={styles.pillAlt}>
                    {s}
                    <button
                      type="button"
                      style={{ ...styles.pillX, background: "#ede9fe", color: "#6d28d9" }}
                      onClick={() => removeTag(s, setSkillsPreferred)}
                      aria-label={`Remove ${s}`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>

              <div style={styles.divider} />

              <div style={styles.row}>
                <input
                  style={{ ...styles.input, flex: 1, minWidth: 240 }}
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
                  style={styles.outlineBtn}
                  onClick={() => addTag(preferredInput, setPreferredInput, skillsPreferred, setSkillsPreferred)}
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>

            <div style={styles.divider} />

            {/* MAP COORDINATES */}
            <div style={styles.formGrid2}>
              <div style={styles.field}>
                <label style={styles.label}>
                  <Compass size={14} /> Latitude
                </label>
                <input
                  style={styles.input}
                  placeholder="e.g., 33.8938"
                  value={formData.latitude}
                  onChange={(e) => setField("latitude", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  <Compass size={14} /> Longitude
                </label>
                <input
                  style={styles.input}
                  placeholder="e.g., 35.5018"
                  value={formData.longitude}
                  onChange={(e) => setField("longitude", e.target.value)}
                />
              </div>
            </div>

            <div style={styles.divider} />

            {/* DEADLINE */}
            <div style={styles.field}>
              <label style={styles.label}>
                <Calendar size={14} /> Application Deadline
              </label>
              <input
                style={styles.input}
                type="date"
                value={formData.deadline}
                onChange={(e) => setField("deadline", e.target.value)}
              />
            </div>

            <div style={styles.actions}>
              <button type="button" style={styles.primaryBtn} onClick={publish}>
                Publish Job
              </button>
              <button type="button" style={styles.outlineBtn} onClick={saveDraft}>
                Save Draft
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* LISTINGS TAB */}
      {activeTab === "listings" && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: "grid", gap: 12 }}>
            {listings.map((job) => (
              <div key={job.id} style={styles.listingCard}>
                <div style={styles.listingTop}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, display: "flex", gap: 8, alignItems: "center" }}>
                      <Briefcase size={16} />
                      {job.title}
                    </div>

                    <div style={styles.small}>
                      {job.location} • {job.type} • {job.workMode}
                    </div>

                    <div style={{ height: 8 }} />

                    <div style={styles.small}>
                      Posted: {fmtDate(job.postedDate)} • Deadline: {fmtDate(job.deadline)} •{" "}
                      <Users size={14} style={{ verticalAlign: "middle" }} /> Applicants:{" "}
                      <b style={{ color: "#111827" }}>{job.applicants}</b>
                    </div>

                    <div style={{ height: 10 }} />

                    <div style={styles.small}>
                      <b>Description:</b> {job.description || "—"}
                    </div>

                    <div style={{ height: 6 }} />

                    <div style={styles.small}>
                      <b>Benefits & Perks:</b> {job.benefitsPerks || "—"}
                    </div>

                    <div style={{ height: 10 }} />

                    <div style={styles.row}>
                      {job.skillsRequired.map((s) => (
                        <span key={"r-" + s} style={styles.pill}>
                          {s}
                        </span>
                      ))}
                      {job.skillsPreferred.map((s) => (
                        <span key={"p-" + s} style={styles.pillAlt}>
                          {s}
                        </span>
                      ))}
                    </div>

                    <div style={{ height: 8 }} />
                    <div style={styles.small}>
                      <b>Lat/Long:</b> {job.latitude || "—"}, {job.longitude || "—"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={badgeStyle(job.status)}>
                      {job.status === "active" ? "Active" : job.status === "draft" ? "Draft" : "Closed"}
                    </span>

                    {job.status === "active" && (
                      <button type="button" style={styles.dangerBtn} onClick={() => closeJob(job.id)}>
                        <XCircle size={16} /> Close
                      </button>
                    )}

                    {job.status === "closed" && (
                      <button type="button" style={styles.successBtn} onClick={() => reopenJob(job.id)}>
                        <RotateCcw size={16} /> Reopen
                      </button>
                    )}
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