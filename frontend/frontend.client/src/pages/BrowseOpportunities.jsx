import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    SlidersHorizontal,
    MapPin,
    Clock,
    Bookmark,
    TrendingUp,
    ArrowUpDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./styles/browseopportunities.css";

// ✅ Vite API URL (set in .env: VITE_API_URL=https://localhost:7176)
const API_URL = import.meta.env.VITE_API_URL;

// ✅ logo based on type/level (emoji avatar)
function getOppLogo(type, level) {
    const t = String(type || "").toLowerCase();
    const l = String(level || "").toLowerCase();

    if (t === "internship" || l === "intern") return "🎓";
    if (t === "scholarship") return "🏆";
    if (t === "workshop") return "🧠";
    if (t === "job") return "💼";
    return "📌";
}

export function BrowseOpportunities() {
    const navigate = useNavigate();

    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("match");

    const [typeFilter, setTypeFilter] = useState("all");
    const [levelFilter, setLevelFilter] = useState("all"); // ✅ now will be Entry / Junior / Senior
    const [locationFilter, setLocationFilter] = useState("all");
    const [matchFilter, setMatchFilter] = useState("all");

    const [savedItems, setSavedItems] = useState([2]);

    // ✅ backend data
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(false);

    const toggleSaved = (id) => {
        setSavedItems((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    // ✅ fetch from backend
    useEffect(() => {
        const controller = new AbortController();

        const fetchOpportunities = async () => {
            try {
                setLoading(true);

                // GET /api/opportunities?q=&type=&level=&remote=&location=&skills=&minPay=&maxPay=&sort=&page=&pageSize=
                const params = new URLSearchParams();

                if (searchQuery.trim()) params.set("q", searchQuery.trim());

                // backend expects: type = Internship/Job/Scholarship/Workshop
                if (typeFilter !== "all") params.set("type", typeFilter);

                // ✅ FIX: backend + UI now agree: level = Entry/Junior/Senior
                if (levelFilter !== "all") params.set("level", levelFilter);

                // locationFilter -> remote boolean or location string
                if (locationFilter === "remote") params.set("remote", "true");
                if (locationFilter === "onsite") params.set("remote", "false");
                if (locationFilter === "hybrid") params.set("location", "hybrid");

                // sort mapping
                const backendSort =
                    sortBy === "salary"
                        ? "salaryhigh"
                        : sortBy === "deadline"
                            ? "deadline"
                            : "newest";

                params.set("sort", backendSort);
                params.set("page", "1");
                params.set("pageSize", "50");

                const res = await fetch(`${API_URL}/api/opportunities?${params.toString()}`, {
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                });

                if (!res.ok) throw new Error(`Failed to fetch opportunities (${res.status})`);

                const data = await res.json();

                const mapped = (data.items || []).map((o) => {
                    const payText =
                        o.minPay == null && o.maxPay == null
                            ? "—"
                            : o.minPay != null && o.maxPay != null
                                ? `$${o.minPay} - $${o.maxPay}`
                                : o.minPay != null
                                    ? `From $${o.minPay}`
                                    : `Up to $${o.maxPay}`;

                    const locationText = o.isRemote ? "Remote" : (o.location || "—");

                    const postedText = o.createdAtUtc ? timeAgoFromUtc(o.createdAtUtc) : "—";
                    const deadlineText = o.deadlineUtc ? daysLeftFromUtc(o.deadlineUtc) : "—";

                    const match = typeof o.matchPercent === "number" ? Math.round(o.matchPercent) : 0;

                    return {
                        id: o.id,
                        title: o.title || "",
                        company: o.companyName || "",
                        logo: getOppLogo(o.type, o.level),
                        type: o.type || "",
                        level: o.level || "",
                        location: locationText,
                        salary: payText,
                        posted: postedText,
                        deadline: deadlineText,
                        match,
                        skills: Array.isArray(o.skills) ? o.skills : [],
                        saved: false,
                    };
                });

                setOpportunities(mapped);
            } catch (err) {
                if (err?.name !== "AbortError") {
                    console.error(err);
                    setOpportunities([]);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchOpportunities();
        return () => controller.abort();
    }, [searchQuery, typeFilter, levelFilter, locationFilter, sortBy]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();

        let list = opportunities.filter((opp) => {
            const matchesQuery =
                !q ||
                opp.title.toLowerCase().includes(q) ||
                opp.company.toLowerCase().includes(q) ||
                opp.skills.some((s) => s.toLowerCase().includes(q));

            // Note: because we already filter on backend, these are mostly redundant,
            // but keeping them is fine.
            const matchesType =
                typeFilter === "all" || opp.type.toLowerCase() === typeFilter.toLowerCase();

            // ✅ FIX: Now levelFilter values match backend level strings (Entry/Junior/Senior)
            const matchesLevel =
                levelFilter === "all" || opp.level.toLowerCase() === levelFilter.toLowerCase();

            const matchesLocation =
                locationFilter === "all"
                    ? true
                    : locationFilter === "remote"
                        ? opp.location.toLowerCase().includes("remote")
                        : locationFilter === "onsite"
                            ? !opp.location.toLowerCase().includes("remote")
                            : locationFilter === "hybrid"
                                ? opp.location.toLowerCase().includes("hybrid")
                                : true;

            const matchesScore =
                matchFilter === "all"
                    ? true
                    : matchFilter === "high"
                        ? opp.match >= 80
                        : matchFilter === "medium"
                            ? opp.match >= 60 && opp.match <= 79
                            : matchFilter === "low"
                                ? opp.match < 60
                                : true;

            return matchesQuery && matchesType && matchesLevel && matchesLocation && matchesScore;
        });

        list = [...list].sort((a, b) => {
            if (sortBy === "match") return b.match - a.match;
            if (sortBy === "newest") return extractDays(a.posted) - extractDays(b.posted);
            if (sortBy === "salary") return salaryScore(b.salary) - salaryScore(a.salary);
            if (sortBy === "deadline") return extractDaysLeft(b.deadline) - extractDaysLeft(a.deadline);
            return 0;
        });

        return list;
    }, [opportunities, searchQuery, typeFilter, levelFilter, locationFilter, matchFilter, sortBy]);

    return (
        <div className="bo-root bo-space">
            {/* Header */}
            <div className="bo-header">
                <h1 className="bo-title">Browse Opportunities</h1>
                <p className="bo-subtitle">Discover opportunities that match your skills and interests</p>
            </div>

            {/* Search & Filters */}
            <div className="bo-card">
                <div className="bo-cardContent">
                    <div className="bo-toolbar">
                        {/* Search */}
                        <div className="bo-searchWrap">
                            <Search className="bo-searchIcon" />
                            <input
                                className="bo-input bo-inputSearch"
                                type="text"
                                placeholder="Search by title, company, or skills..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Filter Toggle */}
                        <button
                            className="bo-btn bo-btnOutline"
                            type="button"
                            onClick={() => setShowFilters((s) => !s)}
                        >
                            <SlidersHorizontal className="bo-btnIcon" />
                            Filters
                        </button>

                        {/* Sort */}
                        <div className="bo-selectWrap">
                            <ArrowUpDown className="bo-selectIcon" />
                            <select
                                className="bo-select"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="match">Best Match</option>
                                <option value="newest">Newest</option>
                                <option value="deadline">Deadline</option>
                                <option value="salary">Salary</option>
                            </select>
                        </div>
                    </div>

                    {/* Filter Options */}
                    <AnimatePresence initial={false}>
                        {showFilters && (
                            <motion.div
                                className="bo-filters"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="bo-filterGrid">
                                    <div className="bo-field">
                                        <label className="bo-label">Type</label>
                                        <select
                                            className="bo-select"
                                            value={typeFilter}
                                            onChange={(e) => setTypeFilter(e.target.value)}
                                        >
                                            <option value="all">All Types</option>
                                            <option value="Internship">Internship</option>
                                            <option value="Job">Job</option>
                                            <option value="Scholarship">Scholarship</option>
                                            <option value="Workshop">Workshop</option>
                                        </select>
                                    </div>

                                    {/* ✅ FIXED: Entry / Junior / Senior */}
                                    <div className="bo-field">
                                        <label className="bo-label">Level</label>
                                        <select
                                            className="bo-select"
                                            value={levelFilter}
                                            onChange={(e) => setLevelFilter(e.target.value)}
                                        >
                                            <option value="all">All Levels</option>
                                            <option value="Entry">Entry</option>
                                            <option value="Junior">Junior</option>
                                            <option value="Senior">Senior</option>
                                        </select>
                                    </div>

                                    <div className="bo-field">
                                        <label className="bo-label">Location</label>
                                        <select
                                            className="bo-select"
                                            value={locationFilter}
                                            onChange={(e) => setLocationFilter(e.target.value)}
                                        >
                                            <option value="all">All Locations</option>
                                            <option value="remote">Remote</option>
                                            <option value="onsite">On-site</option>
                                            <option value="hybrid">Hybrid</option>
                                        </select>
                                    </div>

                                    <div className="bo-field">
                                        <label className="bo-label">Match Score</label>
                                        <select
                                            className="bo-select"
                                            value={matchFilter}
                                            onChange={(e) => setMatchFilter(e.target.value)}
                                        >
                                            <option value="all">Any Match</option>
                                            <option value="high">80%+ Match</option>
                                            <option value="medium">60-79% Match</option>
                                            <option value="low">Below 60%</option>
                                        </select>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Results Count */}
            <div className="bo-resultsRow">
                <p className="bo-resultsText">
                    {loading ? (
                        <>Loading…</>
                    ) : (
                        <>
                            Showing <span className="bo-resultsStrong">{filtered.length}</span> opportunities
                        </>
                    )}
                </p>
            </div>

            {/* Opportunities List */}
            <div className="bo-list">
                {filtered.map((opp, index) => {
                    const isSaved = savedItems.includes(opp.id);

                    return (
                        <motion.div
                            key={opp.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.06, 0.4) }}
                        >
                            <div className="bo-card bo-cardHover">
                                <div className="bo-cardContent">
                                    <div className="bo-row">
                                        {/* Left */}
                                        <div className="bo-left">
                                            <div className="bo-logo">{opp.logo}</div>

                                            <div className="bo-main">
                                                <div className="bo-topLine">
                                                    <div>
                                                        <button
                                                            type="button"
                                                            className="bo-oppTitleBtn"
                                                            onClick={() => navigate(`/opportunity/${opp.id}`)}
                                                        >
                                                            {opp.title}
                                                        </button>
                                                        <p className="bo-company">{opp.company}</p>
                                                    </div>
                                                </div>

                                                <div className="bo-meta">
                                                    <span className={badgeTypeClass(opp.type)}>{opp.type}</span>
                                                    <span className="bo-badge bo-badgeOutline">{opp.level}</span>

                                                    <span className="bo-metaItem">
                                                        <MapPin className="bo-ico" />
                                                        {opp.location}
                                                    </span>

                                                    <span className="bo-dot">•</span>
                                                    <span>{opp.salary}</span>
                                                </div>

                                                <div className="bo-skills">
                                                    {opp.skills.map((skill) => (
                                                        <span key={skill} className="bo-badge bo-badgeSkill">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>

                                                <div className="bo-bottomMeta">
                                                    <span className="bo-metaItem">
                                                        <Clock className="bo-ico" />
                                                        {opp.posted}
                                                    </span>
                                                    <span className="bo-dot">•</span>
                                                    <span className="bo-deadline">{opp.deadline}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right */}
                                        <div className="bo-right">
                                            <div className="bo-match">
                                                <div className="bo-matchTop">
                                                    <TrendingUp className="bo-matchIcon" />
                                                    <span className="bo-matchLabel">MATCH</span>
                                                </div>
                                                <div className="bo-matchValue">{opp.match}%</div>
                                            </div>

                                            <div className="bo-actions">
                                                <button
                                                    type="button"
                                                    className="bo-btn bo-btnPrimary"
                                                    onClick={() => navigate(`/apply/${opp.id}`)}
                                                >
                                                    Apply Now
                                                </button>

                                                <button
                                                    type="button"
                                                    className={`bo-btn bo-btnOutline bo-saveBtn ${isSaved ? "isSaved" : ""}`}
                                                    onClick={() => toggleSaved(opp.id)}
                                                    aria-label={isSaved ? "Unsave" : "Save"}
                                                    title={isSaved ? "Unsave" : "Save"}
                                                >
                                                    <Bookmark className={`bo-saveIcon ${isSaved ? "isSaved" : ""}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Load More */}
            <div className="bo-loadMore">
                <button className="bo-btn bo-btnOutline" type="button">
                    Load More Opportunities
                </button>
            </div>
        </div>
    );
}

/* helpers */
function extractDays(postedText) {
    const t = String(postedText || "").toLowerCase();
    if (t.includes("week")) {
        const n = parseInt(t, 10);
        return isNaN(n) ? 999 : n * 7;
    }
    if (t.includes("day")) {
        const n = parseInt(t, 10);
        return isNaN(n) ? 999 : n;
    }
    return 999;
}

function extractDaysLeft(deadlineText) {
    const n = parseInt(String(deadlineText || ""), 10);
    return isNaN(n) ? 999 : n;
}

function salaryScore(salaryText) {
    const t = String(salaryText || "").toLowerCase();
    if (t.includes("volunteer")) return 0;

    if (t.includes("/hr")) {
        const nums = t.match(/(\d+)\s*-\s*(\d+)/);
        if (nums && nums[2]) return parseInt(nums[2], 10);
        const one = t.match(/(\d+)/);
        return one ? parseInt(one[1], 10) : 0;
    }

    const k = t.match(/(\d+)\s*k\s*-\s*(\d+)\s*k/);
    if (k && k[2]) return parseInt(k[2], 10);

    const m = t.replace(/,/g, "").match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
}

function badgeTypeClass(type) {
    const base = "bo-badge bo-badgeType";
    const t = String(type || "").toLowerCase();
    if (t === "internship") return `${base} isInternship`;
    if (t === "job") return `${base} isJob`;
    if (t === "scholarship") return `${base} isScholarship`;
    return `${base} isOther`;
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

function daysLeftFromUtc(utcString) {
    const d = new Date(utcString);
    if (Number.isNaN(d.getTime())) return "—";
    const diffMs = d.getTime() - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days < 0) return "deadline passed";
    if (days === 0) return "deadline today";
    if (days === 1) return "1 day left";
    return `${days} days left`;
}
