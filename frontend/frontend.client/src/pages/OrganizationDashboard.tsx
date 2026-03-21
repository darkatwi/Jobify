import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
  postedDate: string;
  deadline: string;
  applicants: number;
  location: string;
  type: string;
  workMode: string;
  description: string;
  benefitsPerks: string;
  skillsRequired: string[];
  skillsPreferred: string[];
  latitude: string;
  longitude: string;
};

const API_BASE = "http://localhost:5159/api";

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 20,
    maxWidth: 1150,
    margin: "0 auto",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    color: "var(--text)",
    background: "var(--bg)",
  },
  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 18,
    boxShadow: "var(--shadow)",
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
    background: "var(--blue)",
    display: "grid",
    placeItems: "center",
    color: "white",
    fontWeight: 800,
    fontSize: 18,
  },
  h1: { margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)" },
  muted: { margin: "6px 0 0 0", color: "var(--muted)" },

  tabs: {
    display: "flex",
    gap: 10,
    borderBottom: "1px solid var(--border)",
    marginTop: 16,
    marginBottom: 16,
  },
  tabBtn: {
    padding: "10px 12px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 700,
    color: "var(--muted)",
    borderBottom: "2px solid transparent",
  },
  tabBtnActive: { color: "var(--blue)", borderBottom: "2px solid var(--blue)" },

  sectionTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "var(--text)",
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
  label: { fontSize: 13, fontWeight: 700, color: "var(--text)" },

  input: {
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "10px 12px",
    outline: "none",
    fontSize: 14,
    background: "var(--card)",
    color: "var(--text)",
  },
  textarea: {
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "10px 12px",
    outline: "none",
    fontSize: 14,
    minHeight: 110,
    resize: "vertical",
    background: "var(--card)",
    color: "var(--text)",
  },

  row: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(37, 99, 235, 0.12)",
    color: "var(--blue)",
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid rgba(37, 99, 235, 0.25)",
  },
  pillAlt: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(139, 92, 246, 0.12)",
    color: "#7c3aed",
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid rgba(139, 92, 246, 0.22)",
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
    borderTop: "1px solid var(--border)",
    flexWrap: "wrap",
  },
  primaryBtn: {
    border: "none",
    background: "var(--blue)",
    color: "white",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  outlineBtn: {
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  dangerBtn: {
    border: "1px solid rgba(239, 68, 68, 0.28)",
    background: "rgba(239, 68, 68, 0.10)",
    color: "#dc2626",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 900,
    cursor: "pointer",
  },
  successBtn: {
    border: "1px solid rgba(16, 185, 129, 0.28)",
    background: "rgba(16, 185, 129, 0.10)",
    color: "#059669",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 900,
    cursor: "pointer",
  },

  listingCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
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
  small: { color: "var(--muted)", fontSize: 13 },

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
  badgeActive: { background: "rgba(16, 185, 129, 0.10)", color: "#059669", borderColor: "rgba(16, 185, 129, 0.28)" },
  badgeDraft: { background: "var(--surface-2)", color: "var(--text)", borderColor: "var(--border)" },
  badgeClosed: { background: "rgba(239, 68, 68, 0.10)", color: "#dc2626", borderColor: "rgba(239, 68, 68, 0.28)" },

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
  const [activeTab, setActiveTab] = useState<Tab>("post");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingsError, setListingsError] = useState("");

  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<number | null>(null);

  const [selectedApplication, setSelectedApplication] = useState<any | null>(null);
  const [loadingApplicationDetails, setLoadingApplicationDetails] = useState(false);
  const [applicationDetailsError, setApplicationDetailsError] = useState("");

  const [applicationNotes, setApplicationNotes] = useState<Record<number, string>>({});
  const [applicationStatuses, setApplicationStatuses] = useState<Record<number, string>>({});

  const [skillsRequired, setSkillsRequired] = useState<string[]>(["React", "JavaScript"]);
  const [requiredInput, setRequiredInput] = useState("");

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

  const user = JSON.parse(String(localStorage.getItem("jobify_signup")));
  const companyName = user?.companyName;
  const navigate = useNavigate();

  async function fetchListings() {
    try {
      setLoadingListings(true);
      setListingsError("");

      const token = localStorage.getItem("jobify_token");

      const res = await fetch(`${API_BASE}/opportunities/company/${companyName}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch recruiter listings.");
      }

      const data = await res.json();

      const mapped: Listing[] = data.map((o: any) => ({
        id: o.id,
        title: o.title,
        status: o.isClosed ? "closed" : "active",
        postedDate: o.createdAtUtc ? o.createdAtUtc.slice(0, 10) : "",
        deadline: o.deadlineUtc ? o.deadlineUtc.slice(0, 10) : "",
        applicants: o.applicantCount ?? 0,
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
    } catch (err: any) {
      setListingsError(err.message || "Something went wrong.");
    } finally {
      setLoadingListings(false);
    }
  }

  async function fetchApplicationsForOpportunity(opportunityId: number) {
    try {
      setLoadingApplications(true);
      setApplicationsError("");
      setSelectedOpportunityId(opportunityId);
      setSelectedApplication(null);

      const token = localStorage.getItem("jobify_token");

      const res = await fetch(`${API_BASE}/application/recruiter/opportunity/${opportunityId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch applications.");
      }

      const data = await res.json();
      setApplications(data);

      const initialNotes: Record<number, string> = {};
      const initialStatuses: Record<number, string> = {};

      data.forEach((application: any) => {
        initialNotes[application.applicationId] = application.note || "";
        initialStatuses[application.applicationId] = application.status || "";
      });

      setApplicationNotes(initialNotes);
      setApplicationStatuses(initialStatuses);

      setActiveTab("applications");
    } catch (err: any) {
      setApplicationsError(err.message || "Something went wrong.");
    } finally {
      setLoadingApplications(false);
    }
  }

  async function fetchApplicationDetails(applicationId: number) {
    try {
      setSelectedApplication(null);
      setLoadingApplicationDetails(true);
      setApplicationDetailsError("");

      const token = localStorage.getItem("jobify_token");

      const res = await fetch(`${API_BASE}/application/recruiter/${applicationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch application details.");
      }

      const data = await res.json();
      setSelectedApplication(data);
    } catch (err: any) {
      setApplicationDetailsError(err.message || "Something went wrong.");
    } finally {
      setLoadingApplicationDetails(false);
    }
  }

  async function updateApplication(applicationId: number) {
    try {
      const token = localStorage.getItem("jobify_token");

      const res = await fetch(`${API_BASE}/application/${applicationId}/recruiter`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: applicationStatuses[applicationId] || "Pending",
          note: applicationNotes[applicationId] || ""
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update application.");
      }

      await fetchApplicationDetails(applicationId);

      if (selectedOpportunityId !== null) {
        await fetchApplicationsForOpportunity(selectedOpportunityId);
      }

      alert(`Application of ID: ${applicationId} was updated successfully.`);
    } catch (error: any) {
      alert(error.message || "Updating the application went wrong.");
    }
  }

  const count = useMemo(() => listings.length, [listings]);

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

  async function publish() {
    const err = validateStrict();
    if (err) {
      alert(err);
      return;
    }

    try {
      const token = localStorage.getItem("jobify_token");

      const res = await fetch(`${API_BASE}/opportunities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          companyName: companyName,
          location: formData.location || null,
          type: formData.employmentType,
          level: "Entry",
          workMode: formData.workType,
          description: formData.description || null,
          deadlineUtc: formData.deadline || null,
          responsibilities: [],
          preferredSkills: skillsPreferred || [],
          benefits: formData.benefitsPerks ? [formData.benefitsPerks] : [],
          latitude: formData.latitude ? Number(formData.latitude) : null,
          longitude: formData.longitude ? Number(formData.longitude) : null,
          minPay: null,
          maxPay: null
        })
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }

      const data = await res.json();

      alert("Opportunity published successfully!");
      console.log("Created opportunity:", data);

      await fetchListings();
      resetForm();
      setActiveTab("listings");
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Failed to publish opportunity");
      }
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
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div style={styles.orgLeft}>
            <div style={styles.orgAvatar}>TC</div>
            <div>
              <h1 style={styles.h1}>{companyName}</h1>
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

          <button
            type="button"
            style={{ ...styles.tabBtn, ...(activeTab === "applications" ? styles.tabBtnActive : null) }}
            onClick={() => setActiveTab("applications")}
          >
            Applications
          </button>
        </div>
      </div>

      <div style={styles.divider} />

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

            <div style={styles.field}>
              <label style={styles.label}>Required Skills</label>

              <div style={styles.row}>
                {skillsRequired.map((s) => (
                  <span key={s} style={styles.pill}>
                    {s}
                    <button
                      type="button"
                      style={{ ...styles.pillX, background: "rgba(37, 99, 235, 0.18)", color: "var(--blue)" }}
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

            <div style={styles.field}>
              <label style={styles.label}>Preferred Skills (nice-to-have)</label>

              <div style={styles.row}>
                {skillsPreferred.map((s) => (
                  <span key={s} style={styles.pillAlt}>
                    {s}
                    <button
                      type="button"
                      style={{ ...styles.pillX, background: "rgba(139, 92, 246, 0.18)", color: "#7c3aed" }}
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

      {activeTab === "listings" && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: "grid", gap: 12 }}>
            {loadingListings && <p style={styles.small}>Loading listings...</p>}
            {listingsError && <p style={{ ...styles.small, color: "#dc2626" }}>{listingsError}</p>}

            {!loadingListings && listings.length === 0 && !listingsError && (
              <div style={styles.card}>
                <p style={styles.muted}>No listings yet.</p>
              </div>
            )}

            {listings.map((job) => (
              <div key={job.id} style={styles.listingCard}>
                <div style={styles.listingTop}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, display: "flex", gap: 8, alignItems: "center", color: "var(--text)" }}>
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
                      <b style={{ color: "var(--text)" }}>{job.applicants}</b>
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

                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>
                    Applicants: {job.applicants}
                  </span>

                  <button type="button" style={styles.outlineBtn} onClick={() => fetchApplicationsForOpportunity(job.id)}>
                    View Applicants
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {activeTab === "applications" && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>
              <Users size={18} />
              Applications
            </h2>

            <div style={styles.divider} />

            {selectedOpportunityId === null && (
              <p style={styles.muted}>Choose a Listing and Click on "View Applicants".</p>
            )}

            {loadingApplications && (
              <p style={styles.small}>Loading applications...</p>
            )}

            {applicationsError && (
              <p style={{ ...styles.small, color: "#dc2626" }}>{applicationsError}</p>
            )}

            <div style={{ display: "grid", gap: 12 }}>
              {applications.map((application) => (
                <div key={application.applicationId} style={styles.listingCard}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <strong style={{ fontSize: 16, color: "var(--text)" }}>
                      Application: {application.applicationId}
                    </strong>

                    <p style={styles.small}>
                      <b>Student:</b> {application.candidateName}
                    </p>

                    <p style={styles.small}>
                      <b>Status:</b> {application.status}
                    </p>

                    <p style={styles.small}>
                      <b>Created At:</b> {fmtDate(application.createdAtUtc)}
                    </p>

                    <div style={styles.field}>
                      <label style={styles.label}>Recruiter Note</label>
                      <textarea
                        style={styles.textarea}
                        placeholder="Add recruiter note"
                        value={applicationNotes[application.applicationId] || ""}
                        onChange={(e) =>
                          setApplicationNotes({ ...applicationNotes, [application.applicationId]: e.target.value })}
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Update Status</label>
                      <select
                        style={styles.input}
                        value={applicationStatuses[application.applicationId] || "Pending"}
                        onChange={(e) =>
                          setApplicationStatuses({ ...applicationStatuses, [application.applicationId]: e.target.value })}
                      >
                        <option value="Pending">Pending</option>
                        <option value="InReview">In Review</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div style={styles.actions}>
                      <button type="button" style={styles.primaryBtn} onClick={() => updateApplication(application.applicationId)}>
                        Update Application
                      </button>

                      <button type="button" style={styles.outlineBtn} onClick={() => fetchApplicationDetails(application.applicationId)}>
                        View Details
                      </button>

                      <button type="button" style={styles.outlineBtn} onClick={() => navigate(`/student-profile/${application.studentUserId}`)}>
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {applications.length === 0 && !loadingApplications && (
                <p style={styles.small}>No applications for this opportunity yet.</p>
              )}
            </div>
          </div>

          <div style={styles.divider} />

          {loadingApplicationDetails && (
            <p style={styles.small}>Loading application details...</p>
          )}

          {applicationDetailsError && (
            <p style={{ ...styles.small, color: "#dc2626" }}>
              {applicationDetailsError}
            </p>
          )}

          {selectedApplication && (
            <div style={styles.card}>
              <h3 style={{ marginTop: 0, marginBottom: 10, color: "var(--text)" }}>
                Selected Application Details
              </h3>

              <div style={styles.small}>
                <b>Application ID:</b> {selectedApplication.applicationId}
              </div>
              <div style={styles.small}>
                <b>Opportunity:</b> {selectedApplication.opportunityTitle}
              </div>
              <div style={styles.small}>
                <b>Student:</b> {selectedApplication.studentUserId}
              </div>
              <div style={styles.small}>
                <b>Status:</b> {selectedApplication.status}
              </div>
              <div style={styles.small}>
                <b>Score:</b> {selectedApplication.assessment?.score ?? "—"}
              </div>
              <div style={styles.small}>
                <b>Flagged:</b> {selectedApplication.assessment?.flagged ? "Yes" : "No"}
              </div>
              <div style={styles.small}>
                <b>Flag Reason:</b> {selectedApplication.assessment?.flagReason || "—"}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}