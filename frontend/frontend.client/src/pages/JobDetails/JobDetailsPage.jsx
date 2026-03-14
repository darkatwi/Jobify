import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/JobDetailsPage.css";

import {
    MapPin,
    Building2,
    Globe,
    DollarSign,
    Clock,
    Calendar,
    Share2,
    Flag,
    Heart,
    CheckCircle2,
    Briefcase,
    Users,
    ChevronRight,
    Star,
    MessageSquare,
    Bookmark,
    ArrowRight,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

function Badge({ children, variant = "neutral" }) {
    return <span className={`badge badge--${variant}`}>{children}</span>;
}

function SectionTitle({ children }) {
    return <h3 className="sectionTitle">{children}</h3>;
}

function formatMoneyRange(minPay, maxPay) {
    if (minPay == null && maxPay == null) return "—";
    if (minPay != null && maxPay != null) return `$${minPay} - $${maxPay} / month`;
    if (minPay != null) return `From $${minPay} / month`;
    return `Up to $${maxPay} / month`;
}

function timeAgoFromUtc(utcString) {
    const d = new Date(utcString);
    if (Number.isNaN(d.getTime())) return "—";
    const diffMs = Date.now() - d.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days <= 0) return "today";
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

function formatDeadline(utcString) {
    if (!utcString) return "—";
    const d = new Date(utcString);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
}

function CompanyLogo({ name, size = 64, logoUrl }) {
    const letter = (name?.trim()?.[0] || "J").toUpperCase();

    return (
        <div
            className="companyLogo"
            style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
        >
            {logoUrl ? (
                <img src={logoUrl} alt={name || "Company"} />
            ) : (
                <span className="companyLogoFallback">{letter}</span>
            )}
        </div>
    );
}


export default function JobDetailsPage() {
    const { id } = useParams();

    const navigate = useNavigate();

    const handleApply = async () => {
        const token = localStorage.getItem("jobify_token");
        if (!token) {
            navigate("/login");
            return;
        }

        try {
            const res = await fetch(`${API_URL}/opportunities/${id}/apply`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const t = await res.text().catch(() => "");
                alert(t || `Apply failed (${res.status})`);
                return;
            }

            const data = await res.json(); 
            navigate(`/apply/${data.applicationId}/review`);
        } catch (e) {
            console.error(e);
            alert("Failed to apply. Try again.");
        }
    };


    const [isSaved, setIsSaved] = useState(false);

    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    const [similar, setSimilar] = useState([]);
    const [similarLoading, setSimilarLoading] = useState(true);
    const [similarErr, setSimilarErr] = useState("");


    const [askOpen, setAskOpen] = useState(false);
    const [questionText, setQuestionText] = useState("");
    const [askLoading, setAskLoading] = useState(false);
    const [askErr, setAskErr] = useState("");
    const [askOk, setAskOk] = useState("");

    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportDetails, setReportDetails] = useState("");
    const [reportLoading, setReportLoading] = useState(false);
    const [reportErr, setReportErr] = useState("");
    const [reportOk, setReportOk] = useState("");

    const [shareOk, setShareOk] = useState("");
    const [shareErr, setShareErr] = useState("");



    useEffect(() => {
        const controller = new AbortController();

        const fetchDetails = async () => {
            try {
                setLoading(true);
                setErr("");

                const res = await fetch(`${API_URL}/opportunities/${id}`, {
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                });

                if (!res.ok) throw new Error(`Failed to load opportunity (${res.status})`);

                const data = await res.json();

                setJob({
                    ...data,
                    skills: Array.isArray(data.skills)
                        ? data.skills
                        : Array.isArray(data.skillsRequired)
                            ? data.skillsRequired
                            : [],
                    preferredSkills: Array.isArray(data.preferredSkills)
                        ? data.preferredSkills
                        : [],
                });
            } catch (e) {
                if (e?.name !== "AbortError") {
                    console.error(e);
                    setErr(e?.message || "Failed to load opportunity");
                    setJob(null);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
        return () => controller.abort();
    }, [id]);

    useEffect(() => {
        const controller = new AbortController();

        const loadSimilar = async () => {
            try {
                setSimilarLoading(true);
                setSimilarErr("");

                const res = await fetch(`${API_URL}/opportunities/${id}/similar?take=4`, {
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                });

                if (!res.ok) throw new Error(`Failed to load similar (${res.status})`);

                const data = await res.json();
                setSimilar(Array.isArray(data) ? data : []);
            } catch (e) {
                if (e?.name !== "AbortError") {
                    console.error(e);
                    setSimilarErr(e?.message || "Failed to load similar opportunities");
                    setSimilar([]);
                }
            } finally {
                setSimilarLoading(false);
            }
        };

        if (id) loadSimilar();
        return () => controller.abort();
    }, [id]);


    const submitQuestion = async () => {
        try {
            setAskErr("");
            setAskOk("");

            const q = questionText.trim();
            if (!q) {
                setAskErr("Please type a question.");
                return;
            }

            const token = localStorage.getItem("jobify_token");
            if (!token) {
                setAskErr("You need to be logged in to ask a question.");
                return;
            }

            setAskLoading(true);

            const res = await fetch(`${API_URL}/opportunities/${id}/questions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ question: q }),
            });

            if (!res.ok) {
                let msg = `Failed to submit question (${res.status})`;
                try {
                    const t = await res.text();
                    if (t) msg = t;
                } catch { }
                setAskErr(msg);
                return;
            }

            setAskOk("Question submitted!");
            setQuestionText("");
            setAskOpen(false);

            const refreshed = await fetch(`${API_URL}/opportunities/${id}`, {
                headers: { "Content-Type": "application/json" },
            });
            if (refreshed.ok) {
                const data = await refreshed.json();
                setJob(data);
            }
        } catch (e) {
            console.error(e);
            setAskErr(e?.message || "Failed to submit question");
        } finally {
            setAskLoading(false);
        }
    };

    const submitReport = async () => {
        try {
            setReportErr("");
            setReportOk("");

            const reason = reportReason.trim();
            const details = reportDetails.trim();

            if (!reason) {
                setReportErr("Please select a reason.");
                return;
            }

            const token = localStorage.getItem("jobify_token");
            if (!token) {
                setReportErr("You need to be logged in to report an opportunity.");
                return;
            }

            setReportLoading(true);

            const res = await fetch(`${API_URL}/opportunities/${id}/report`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    reason,
                    details: details || null,
                }),
            });

            if (!res.ok) {
                let msg = `Failed to submit report (${res.status})`;
                try {
                    const t = await res.text();
                    if (t) msg = t;
                } catch { }
                setReportErr(msg);
                return;
            }

            setReportOk("Report submitted successfully.");
            setReportReason("");
            setReportDetails("");

            setTimeout(() => {
                setReportOpen(false);
                setReportOk("");
            }, 1000);
        } catch (e) {
            console.error(e);
            setReportErr(e?.message || "Failed to submit report");
        } finally {
            setReportLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            setShareErr("");
            setShareOk("");

            const shareUrl = `${window.location.origin}/opportunities/${id}`;
            const shareData = {
                title: job?.title || "Opportunity",
                text: `${job?.title || "Opportunity"} at ${job?.companyName || "Company"}`,
                url: shareUrl,
            };

            if (navigator.share) {
                await navigator.share(shareData);
                return;
            }

            await navigator.clipboard.writeText(shareUrl);
            setShareOk("Link copied!");
            setTimeout(() => setShareOk(""), 2000);
        } catch (e) {
            console.error(e);

            if (e?.name === "AbortError") return;

            setShareErr("Could not share link.");
            setTimeout(() => setShareErr(""), 2000);
        }
    };

    const location = job?.location || "";
    const isRemote = !!job?.isRemote;

    const embedUrl = useMemo(() => {
        if (!job?.latitude || !job?.longitude || isRemote) return "";
        return `https://www.google.com/maps?q=${job.latitude},${job.longitude}&output=embed`;
    }, [job, isRemote]);


    const mapsUrl = useMemo(() => {
        if (!location || isRemote) return "";
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    }, [location, isRemote]);

    if (loading) {
        return (
            <div className="page">
                <main className="container">Loading…</main>
            </div>
        );
    }

    if (err || !job) {
        return (
            <div className="page">
                <main className="container">{err || "Not found"}</main>
            </div>
        );
    }

    const postedDateText = job.createdAtUtc ? timeAgoFromUtc(job.createdAtUtc) : "—";
    const deadlineText = job.deadlineUtc ? formatDeadline(job.deadlineUtc) : "—";
    const salaryText = formatMoneyRange(job.minPay, job.maxPay);

    const assessment = job.assessment ?? null;
    const assessmentType =
        assessment && typeof assessment === "object"
            ? assessment.type || "—"
            : typeof assessment === "string"
                ? assessment
                : "—";

    const assessmentDuration =
        assessment && typeof assessment === "object" && assessment.estimatedMinutes != null
            ? `${assessment.estimatedMinutes} min`
            : "—";

    const assessmentDeadline = deadlineText;

    const requiredSkills = job?.skillsRequired || job?.skills || [];
    const preferredSkills = job?.preferredSkills || [];


    return (
        <div className="page">
            <main className="container">
                <div className="card heroCard">
                    <div className="heroGlow" />

                    <div className="heroTop">
                        <div className="heroLeft">
                            <div className="logoWrap">
                                <div className="companyLogo">
                                    <Building2 size={30} strokeWidth={1.8} />
                                </div>
                            </div>


                            <div className="heroInfo">
                                <h1 className="heroTitle">{job.title}</h1>

                                <div className="metaRow">
                                    <a className="orgLink" href="#">
                                        <Building2 size={16} />
                                        {job.companyName}
                                    </a>

                                    <span className="metaItem">
                                        <MapPin size={16} />
                                        {isRemote ? "Remote" : job.location || "—"}
                                    </span>

                                    {isRemote && (
                                        <span className="remotePill">
                                            <Globe size={12} />
                                            Remote
                                        </span>
                                    )}

                                    <span className="metaItem">
                                        <Clock size={16} />
                                        Posted {postedDateText}
                                    </span>
                                </div>

                                <div className="badgeRow">
                                    <Badge variant="blue">
                                        <Briefcase size={12} className="iconMr" /> {job.type}
                                    </Badge>
                                    <Badge variant="green">
                                        <DollarSign size={12} className="iconMr" /> {salaryText}
                                    </Badge>
                                    <Badge variant="neutral">
                                        <Calendar size={12} className="iconMr" /> Apply by {deadlineText}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="heroRight">
                            <button className="btnPrimary" onClick={handleApply}>
                                Apply Now <ArrowRight size={18} />
                            </button>

                            <div className="heroActions">
                                <button
                                    className={`btnOutline ${isSaved ? "btnOutlineSaved" : ""}`}
                                    onClick={() => setIsSaved((s) => !s)}
                                >
                                    <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
                                    <span className="hideOnMobile">{isSaved ? "Saved" : "Save"}</span>
                                </button>

                                <button className="btnOutline" onClick={handleShare}>
                                    <Share2 size={18} />
                                    <span className="hideOnMobile">Share</span>
                                </button>

                                <button
                                    className="btnIcon"
                                    title="Report"
                                    onClick={() => {
                                        setReportOpen(true);
                                        setReportErr("");
                                        setReportOk("");
                                    }}
                                >
                                    <Flag size={18} />
                                </button>
                            </div>

                            {shareOk ? <div className="shareFeedback shareSuccess">{shareOk}</div> : null}
                            {shareErr ? <div className="shareFeedback shareError">{shareErr}</div> : null}
                        </div>
                    </div>
                </div>

                <div className="grid">
                    <div className="leftCol">
                        <div className="card">
                            <SectionTitle>About the Role</SectionTitle>
                            <p className="text">{job.description || "—"}</p>

                            <h4 className="subTitle">Key Responsibilities</h4>
                            <ul className="bulletList">
                                {(job.responsibilities || []).length === 0 ? (
                                    <li className="bulletItem">
                                        <span className="dot" />
                                        <span>—</span>
                                    </li>
                                ) : (
                                    job.responsibilities.map((r, idx) => (
                                        <li key={idx} className="bulletItem">
                                            <span className="dot" />
                                            <span>{r}</span>
                                        </li>
                                    ))
                                )}
                            </ul>

                            <h4 className="subTitle">Requirements</h4>

                            <div className="label">Required</div>
                            <div className="tagRow">
                                {requiredSkills.length === 0 ? (
                                    <span className="tag">—</span>
                                ) : (
                                    requiredSkills.map((t) => (
                                        <span key={t} className="tag">
                                            {t}
                                        </span>
                                    ))
                                )}
                            </div>

                            <div className="label">Preferred</div>
                            <div className="tagRow">
                                {preferredSkills.length === 0 ? (
                                    <span className="tag">—</span>
                                ) : (
                                    preferredSkills.map((t) => (
                                        <span key={t} className="tag tagBlue">
                                            {t}
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="card">
                            <SectionTitle>Benefits & Perks</SectionTitle>
                            <div className="benefitsGrid">
                                {(job.benefits || []).length === 0 ? (
                                    <div className="benefitItem">
                                        <CheckCircle2 size={20} className="benefitIcon" />
                                        <span>—</span>
                                    </div>
                                ) : (
                                    job.benefits.map((b, idx) => (
                                        <div key={idx} className="benefitItem">
                                            <CheckCircle2 size={20} className="benefitIcon" />
                                            <span>{b}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="card mapCard fullWidthMap">
                                {mapsUrl ? (
                                    <a className="mapOverlay" href={mapsUrl} target="_blank" rel="noreferrer">
                                        View on Google Maps <ArrowRight size={14} />
                                    </a>
                                ) : (
                                    <div className="mapOverlay">
                                        {isRemote ? "Remote opportunity" : "No location provided"}
                                    </div>
                                )}

                                {embedUrl ? (
                                    <iframe
                                        className="mapFrame"
                                        src={embedUrl}
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        title="Map"
                                    />
                                ) : (
                                    <div className="mapPlaceholder">—</div>
                                )}

                                <div className="mapChip">{isRemote ? "Remote" : job.location || "—"}</div>
                            </div>
                    </div>

                    <div className="rightCol">
                        <div className="card">
                            <div className="matchHeader">
                                <h4 className="matchTitle">Profile Match</h4>
                                <span className="pillGreen">High Match</span>
                            </div>

                            <div className="ringWrap">
                                <MatchRing percent={0} />
                            </div>

                            <div className="matchList">
                                <div className="matchLine">
                                    <span className="miniIcon blueMini">
                                        <CheckCircle2 size={14} />
                                    </span>
                                    <span>Match scoring coming soon…</span>
                                </div>

                                <div className="matchLine">
                                    <span className="miniIcon blueMini">
                                        <CheckCircle2 size={14} />
                                    </span>
                                    <span>Location preference aligns</span>
                                </div>

                                <div className="matchLine">
                                    <span className="miniIcon yellowMini">
                                        <Star size={14} />
                                    </span>
                                    <span>Top applicants insight coming soon…</span>
                                </div>
                            </div>

                            <button className="btnPrimary full" onClick={handleApply}>
                                Apply Now <ArrowRight size={18} />
                            </button>

                            <button className="btnOutline full">Quick Apply (1-Click)</button>
                        </div>

                        <div className="card">
                            <h4 className="subHeader">Job Insights</h4>

                            <div className="insights">
                                <div className="insightRow">
                                    <span className="insightLeft">
                                        <Users size={16} /> Applicants
                                    </span>
                                    <span className="insightVal">—</span>
                                </div>

                                <div className="insightRow">
                                    <span className="insightLeft">
                                        <Clock size={16} /> Avg. Response
                                    </span>
                                    <span className="insightVal">—</span>
                                </div>

                                <div className="insightRow">
                                    <span className="insightLeft">
                                        <Briefcase size={16} /> Experience
                                    </span>
                                    <span className="insightVal">{job.level}</span>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h4 className="subHeader">
                                <Clock size={18} className="blueIcon" /> Assessment Process
                            </h4>

                            <div className="kv">
                                <div className="kvRow">
                                    <span className="kvKey">Duration</span>
                                    <span className="kvVal">{assessmentDuration}</span>
                                </div>
                                <div className="kvRow">
                                    <span className="kvKey">Type</span>
                                    <span className="kvVal">{assessmentType}</span>
                                </div>
                                <div className="kvRow">
                                    <span className="kvKey">Deadline</span>
                                    <span className="kvVal">{assessmentDeadline}</span>
                                </div>

                                <div className="progressBar">
                                    <div className="progressFill" style={{ width: "33%" }} />
                                </div>
                                <p className="mutedSmall">Step 1 of 3 in application process</p>
                            </div>
                        </div>

                        <div className="card">
                            <SectionTitle>Q&A with the Recruiter</SectionTitle>

                            <div className="qaList">
                                {(job.qa || []).length === 0 ? (
                                    <div className="qaCard">
                                        <div className="qaTop">
                                            <div className="qaAvatar" />
                                            <div>
                                                <div className="qaUser">—</div>
                                                <div className="qaQuestion">No questions yet.</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    job.qa.map((q) => (
                                        <div key={q.id} className="qaCard">
                                            <div className="qaTop">
                                                <div className="qaAvatar" />
                                                <div>
                                                    <div className="qaUser">Candidate</div>
                                                    <div className="qaQuestion">{q.question}</div>
                                                </div>
                                            </div>

                                            {q.answer ? (
                                                <div className="qaAnswer">
                                                    <div className="qaAnswerLabel">Recruiter</div>
                                                    <div className="qaAnswerText">{q.answer}</div>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))
                                )}

                                {askOpen ? (
                                    <div className="qaCard">
                                        <div className="qaTop">
                                            <div className="qaAvatar" />
                                            <div style={{ width: "100%" }}>
                                                <div className="qaUser">Ask a question</div>

                                                <textarea
                                                    value={questionText}
                                                    onChange={(e) => setQuestionText(e.target.value)}
                                                    rows={3}
                                                    placeholder="Type your question..."
                                                    style={{
                                                        width: "100%",
                                                        marginTop: 8,
                                                        borderRadius: 10,
                                                        padding: 10,
                                                        border: "1px solid rgba(255,255,255,0.12)",
                                                        background: "transparent",
                                                        color: "inherit",
                                                    }}
                                                />

                                                {askErr ? (
                                                    <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
                                                        {askErr}
                                                    </div>
                                                ) : null}

                                                {askOk ? (
                                                    <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
                                                        {askOk}
                                                    </div>
                                                ) : null}

                                                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                                    <button
                                                        className="btnPrimary"
                                                        onClick={submitQuestion}
                                                        disabled={askLoading}
                                                    >
                                                        {askLoading ? "Sending..." : "Send"} <ArrowRight size={18} />
                                                    </button>
                                                    <button
                                                        className="btnOutline"
                                                        onClick={() => {
                                                            setAskOpen(false);
                                                            setAskErr("");
                                                            setAskOk("");
                                                            setQuestionText("");
                                                        }}
                                                        disabled={askLoading}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <button
                                    className="btnDashed"
                                    onClick={() => {
                                        setAskOpen((o) => !o);
                                        setAskErr("");
                                        setAskOk("");
                                    }}
                                >
                                    <MessageSquare size={16} /> Ask a question
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="similarWrap">
                    <div className="similarHeader">
                        <h2 className="similarTitle">Similar Opportunities</h2>
                        <a href="#" className="similarLink">
                            View all <ChevronRight size={16} />
                        </a>
                    </div>

                    <div className="similarGrid">
                        {similarLoading ? (
                            <div className="similarCard">
                                <h3 className="similarJobTitle">Loading…</h3>
                                <p className="similarMeta">Fetching similar opportunities</p>
                                <span className="salaryPill">—</span>
                            </div>
                        ) : similarErr ? (
                            <div className="similarCard">
                                <h3 className="similarJobTitle">Couldn’t load</h3>
                                <p className="similarMeta">{similarErr}</p>
                                <span className="salaryPill">—</span>
                            </div>
                        ) : similar.length === 0 ? (
                            <div className="similarCard">
                                <h3 className="similarJobTitle">No similar opportunities</h3>
                                <p className="similarMeta">Try creating a few more opportunities with overlapping skills.</p>
                                <span className="salaryPill">—</span>
                            </div>
                        ) : (
                            similar.map((s) => (
                                <div
                                    key={s.id}
                                    className="similarCard"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => navigate(`/opportunities/${s.id}`)}
                                    onKeyDown={(e) => e.key === "Enter" && navigate(`/opportunities/${s.id}`)}
                                >
                                    <div className="similarTop">
                                        <div className="similarLogo">
                                            <Building2 size={22} strokeWidth={1.8} />
                                        </div>
                                        <button
                                            className="bookmarkBtn"
                                            title="Save"
                                            onClick={(e) => {
                                                e.stopPropagation(); 
                                                
                                            }}
                                        >
                                            <Bookmark size={20} />
                                        </button>
                                    </div>

                                    <h3 className="similarJobTitle">{s.title}</h3>
                                    <p className="similarMeta">
                                        {s.companyName} • {s.isRemote ? "Remote" : (s.workMode || "On-site")}
                                    </p>

                                    <span className="salaryPill">{formatMoneyRange(s.minPay, s.maxPay)}</span>
                                </div>
                            ))
                        )}
                    </div>

                </div>

                {reportOpen ? (
                    <div
                        className="reportModalOverlay"
                        onClick={() => {
                            if (!reportLoading) {
                                setReportOpen(false);
                                setReportErr("");
                                setReportOk("");
                            }
                        }}
                    >
                        <div className="reportModal" onClick={(e) => e.stopPropagation()}>
                            <div className="reportModalHeader">
                                <h3 className="reportModalTitle">Report Opportunity</h3>
                                <button
                                    type="button"
                                    className="reportCloseBtn"
                                    onClick={() => {
                                        if (!reportLoading) {
                                            setReportOpen(false);
                                            setReportErr("");
                                            setReportOk("");
                                        }
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            <p className="reportModalText">
                                Tell us why you are reporting this opportunity.
                            </p>

                            <select
                                className="reportSelect"
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                disabled={reportLoading}
                            >
                                <option value="">Select a reason</option>
                                <option value="Spam">Spam</option>
                                <option value="Fake Job">Fake Job</option>
                                <option value="Misleading Information">Misleading Information</option>
                                <option value="Inappropriate Content">Inappropriate Content</option>
                                <option value="Duplicate Posting">Duplicate Posting</option>
                                <option value="Other">Other</option>
                            </select>

                            <textarea
                                className="reportTextarea"
                                value={reportDetails}
                                onChange={(e) => setReportDetails(e.target.value)}
                                placeholder="Additional details (optional)"
                                rows={4}
                                maxLength={1000}
                                disabled={reportLoading}
                            />

                            {reportErr ? <div className="reportFeedback reportError">{reportErr}</div> : null}
                            {reportOk ? <div className="reportFeedback reportSuccess">{reportOk}</div> : null}

                            <div className="reportModalActions">
                                <button
                                    className="btnOutline"
                                    onClick={() => {
                                        if (!reportLoading) {
                                            setReportOpen(false);
                                            setReportErr("");
                                            setReportOk("");
                                        }
                                    }}
                                    disabled={reportLoading}
                                >
                                    Cancel
                                </button>

                                <button
                                    className="btnPrimary"
                                    onClick={submitReport}
                                    disabled={reportLoading}
                                >
                                    {reportLoading ? "Submitting..." : "Submit Report"}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </main>
        </div>
    );
}

function MatchRing({ percent }) {
    const p = Math.max(0, Math.min(100, Number(percent) || 0));
    const dash = `${p}, 100`;

    return (
        <div className="ring">
            <svg className="ringSvg" viewBox="0 0 36 36">
                <path
                    className="ringBg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                    className="ringFg"
                    strokeDasharray={dash}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
            </svg>
            <div className="ringCenter">
                <span className="ringPercent">{p}%</span>
            </div>
        </div>
    );
}
