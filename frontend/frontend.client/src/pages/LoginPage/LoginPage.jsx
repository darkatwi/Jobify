/**
 * LoginPage.jsx
 * -------------
 * Login screen for Jobify.
 *
 * Responsibilities:
 * - Role toggle (candidate / recruiter) affects UI copy and left-panel stats
 * - Client-side email validation + basic required checks
 * - POST /api/Auth/login to backend
 * - Persist auth token + user info in localStorage
 * - Navigate to dashboard on successful login
 *
 * UI Notes:
 * - Uses Framer Motion for animations
 * - Uses AnimatePresence for the rotating "Suggested for you" card (candidate only)
 * - Decorative floating icons on the left panel
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    Eye,
    EyeOff,
    Moon,
    Sun,
    Users,
    Briefcase,
    Target,
    Building2,
    Loader2,
    GraduationCap,
    Code,
    Star,
    MapPin,
    Trophy,
} from "lucide-react";

import "../styles/login.css";

/**
 * Decorative floating icons displayed on the left side of the layout.
 * Visual-only (no functional impact).
 */
const floatingIcons = [
    { Icon: Briefcase, x: "8%", y: "10%", duration: 20 },
    { Icon: GraduationCap, x: "88%", y: "12%", duration: 25 },
    { Icon: Code, x: "10%", y: "78%", duration: 22 },
    { Icon: Star, x: "90%", y: "72%", duration: 18 },
    { Icon: MapPin, x: "78%", y: "88%", duration: 23 },
    { Icon: Trophy, x: "50%", y: "42%", duration: 21 },
];

/**
 * FloatingIcons
 * -------------
 * Renders animated background icons (aria-hidden for accessibility).
 */
function FloatingIcons() {
    return (
        <div className="lp-floatwrap" aria-hidden="true">
            {floatingIcons.map(({ Icon, x, y, duration }, index) => (
                <motion.div
                    key={index}
                    className="lp-floaticon"
                    style={{ left: x, top: y }}
                    animate={{ y: [0, -26, 0], rotate: [0, 10, -10, 0] }}
                    transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
                >
                    <Icon className="lp-floaticon-svg" />
                </motion.div>
            ))}
        </div>
    );
}

export default function LoginPage() {
    const navigate = useNavigate(); // ✅ added

    /**
     * API base URL (Vite .env if exists, fallback if not)
     * Example: VITE_API_URL="https://localhost:7176"
     */
    const API_URL =
        (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
        "https://localhost:7176"; // change if your backend port differs

    // ✅ OAuth redirect helpers
    const loginWithGoogle = () => {
        window.location.href = `${API_URL}/api/Auth/external/Google`;
    };

    const loginWithGitHub = () => {
        window.location.href = `${API_URL}/api/Auth/external/GitHub`;
    };


    /** Theme state (local UI only) */
    const [darkMode, setDarkMode] = useState(false);
    const toggleDarkMode = () => setDarkMode((d) => !d);

    /** Role toggle affects UI copy/stats (auth itself is based on backend response) */
    const [userRole, setUserRole] = useState("candidate");

    /** Form state */
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    /** Password visibility toggle */
    const [showPassword, setShowPassword] = useState(false);

    /** Request + validation state */
    const [isLoading, setIsLoading] = useState(false);
    const [emailError, setEmailError] = useState("");

    /** Basic email regex validation */
    const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    /**
     * Validate email on blur to avoid showing errors while typing.
     */
    const handleEmailBlur = () => {
        if (email && !validateEmail(email)) setEmailError("Please enter a valid email address");
        else setEmailError("");
    };

    /**
     * Submit handler:
     * - Validates email format + required password
     * - Calls backend /api/Auth/login
     * - Saves token + user info to localStorage
     * - Redirects to dashboard on success
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateEmail(email)) {
            setEmailError("Please enter a valid email address");
            return;
        }
        if (!password) return;

        try {
            setIsLoading(true);

            const res = await fetch(`${API_URL}/api/Auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || "Login failed");
            }

            const data = await res.json(); // { token, expiresAt, userId, email, roles }

            // Persist token separately for easy access in API calls
            localStorage.setItem("jobify_token", data.token);

            // Persist user/session context (useful for UI + role-based rendering)
            localStorage.setItem(
                "jobify_user",
                JSON.stringify({
                    userId: data.userId,
                    email: data.email,
                    roles: data.roles,
                    expiresAt: data.expiresAt,
                    userRole, // keeps the UI role toggle too (optional)
                })
            );

            // Navigate to dashboard after successful authentication
            navigate("/dashboard");
        } catch (err) {
            alert(err.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Left-side stats shown for social proof.
     * Changes depending on selected role.
     */
    const stats =
        userRole === "candidate"
            ? [
                { icon: Users, value: "10K+", label: "Candidates" },
                { icon: Briefcase, value: "2K+", label: "Opportunities" },
                { icon: Target, value: "85%", label: "Match Accuracy" },
                { icon: Building2, value: "500+", label: "Partner Organizations" },
            ]
            : [
                { icon: Building2, value: "500+", label: "Organizations" },
                { icon: Users, value: "10K+", label: "Active Candidates" },
                { icon: Briefcase, value: "2K+", label: "Posted Jobs" },
                { icon: Target, value: "85%", label: "Success Rate" },
            ];

    /**
     * Candidate-only "Suggested for you" carousel content.
     * Memoized since it is static demo data.
     */
    const topMatches = useMemo(
        () => [
            { percent: "85%", role: "Research Assistant", org: "University Lab" },
            { percent: "92%", role: "Frontend Intern", org: "Acme Labs" },
            { percent: "88%", role: "Data Analyst Intern", org: "Cedars Tech" },
        ],
        []
    );

    /** Index for rotating suggested matches */
    const [matchIndex, setMatchIndex] = useState(0);

    /** Used to compute slide direction between transitions */
    const prevIndexRef = useRef(0);

    // Track previous index to determine animation direction
    useEffect(() => {
        prevIndexRef.current = matchIndex;
    }, [matchIndex]);

    /**
     * Auto-rotate suggested matches (candidate only).
     * Stops rotation when role is not candidate.
     */
    useEffect(() => {
        if (userRole !== "candidate") return;

        const id = setInterval(() => {
            setMatchIndex((i) => (i + 1) % topMatches.length);
        }, 4000);

        return () => clearInterval(id);
    }, [userRole, topMatches.length]);

    /** Reset match carousel when switching roles */
    useEffect(() => {
        setMatchIndex(0);
    }, [userRole]);

    /** Determine animation direction for the slide transition */
    const direction = matchIndex >= prevIndexRef.current ? 1 : -1;

    /** Framer Motion variants for sliding match row transitions */
    const slideVariants = {
        enter: (dir) => ({ opacity: 0, x: dir > 0 ? 26 : -26 }),
        center: { opacity: 1, x: 0 },
        exit: (dir) => ({ opacity: 0, x: dir > 0 ? -26 : 26 }),
    };

    return (
        <div className={`lp-root ${darkMode ? "lp-dark" : ""}`}>
            <div className="lp-page">
                <div className="lp-grid">
                    <div className="lp-left">
                        <FloatingIcons />

                        <div className="lp-left-inner">
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <h1 className="lp-logo">Jobify</h1>
                                <p className="lp-tagline">Find opportunities that actually fit you.</p>
                            </motion.div>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.6 }}
                                className="lp-desc"
                            >
                                Smart matching based on skills, interests, academic background. Our AI-powered platform connects the right
                                talent with the right opportunities.
                            </motion.p>

                            <div className="lp-stats">
                                {stats.map((stat, i) => {
                                    const Icon = stat.icon;
                                    return (
                                        <motion.div
                                            key={i}
                                            className="lp-statcard"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
                                        >
                                            <div className="lp-staticon">
                                                <Icon size={18} />
                                            </div>
                                            <div>
                                                <div className="lp-statvalue">{stat.value}</div>
                                                <div className="lp-statlabel">{stat.label}</div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Candidate-only suggested matches preview */}
                            {userRole === "candidate" && (
                                <motion.div
                                    className="lp-match"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25, duration: 0.6 }}
                                >
                                    <div className="lp-match-title">Suggested for you</div>

                                    <AnimatePresence mode="wait" custom={direction}>
                                        <motion.div
                                            key={matchIndex}
                                            className="lp-match-row"
                                            variants={slideVariants}
                                            custom={direction}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            transition={{ duration: 0.35, ease: "easeInOut" }}
                                        >
                                            <div className="lp-match-badge">{topMatches[matchIndex].percent}</div>
                                            <div>
                                                <div className="lp-match-role">{topMatches[matchIndex].role}</div>
                                                <div className="lp-match-org">{topMatches[matchIndex].org}</div>
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    <div className="lp-right">
                        <div className="lp-card">
                            {/* Desktop theme toggle */}
                            <div className="lp-darktoggle-desktop">
                                <button className="lp-iconbtn" onClick={toggleDarkMode} type="button" aria-label="Toggle theme">
                                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                                </button>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                {/* Role toggle affects UI copy/preview content */}
                                <div className="lp-roletoggle">
                                    <div className="lp-roletoggle-wrap">
                                        <button
                                            type="button"
                                            onClick={() => setUserRole("candidate")}
                                            className={`lp-rolebtn ${userRole === "candidate" ? "lp-rolebtn--active" : ""}`}
                                        >
                                            Candidate
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUserRole("recruiter")}
                                            className={`lp-rolebtn ${userRole === "recruiter" ? "lp-rolebtn--active" : ""}`}
                                        >
                                            Recruiter
                                        </button>
                                    </div>

                                    <p className="lp-rolehint">
                                        {userRole === "candidate"
                                            ? "Access your candidate dashboard and find opportunities"
                                            : "Manage postings and find the perfect candidates"}
                                    </p>
                                </div>

                                <div className="lp-welcome">
                                    <h2>Welcome back</h2>
                                    <p>Sign in to continue your journey</p>
                                </div>

                                <form onSubmit={handleSubmit} className="lp-form">
                                    <div className="lp-field">
                                        <label className="lp-label" htmlFor="email">
                                            Email
                                        </label>
                                        <input
                                            id="email"
                                            className={`lp-input ${emailError ? "lp-input--error" : ""}`}
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onBlur={handleEmailBlur}
                                            placeholder="you@example.com"
                                            autoComplete="email"
                                        />
                                        {emailError && <div className="lp-error">{emailError}</div>}
                                    </div>

                                    <div className="lp-field">
                                        <label className="lp-label" htmlFor="password">
                                            Password
                                        </label>
                                        <div className="lp-password">
                                            <input
                                                id="password"
                                                className="lp-input lp-input--padright"
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Enter your password"
                                                autoComplete="current-password"
                                            />
                                            <button
                                                type="button"
                                                className="lp-eye"
                                                onClick={() => setShowPassword((s) => !s)}
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Navigation to forgot-password flow */}
                                    <div className="lp-forgot">
                                        <button type="button" className="lp-link" onClick={() => navigate("/forgot-password")}>
                                            Forgot password?
                                        </button>
                                    </div>

                                    <button className="lp-submit" type="submit" disabled={isLoading}>
                                        {isLoading ? (
                                            <span className="lp-loading">
                                                <Loader2 className="lp-spin" size={18} />
                                                Signing in...
                                            </span>
                                        ) : (
                                            "Sign in"
                                        )}
                                    </button>
                                </form>

                                {userRole === "candidate" && (
                                    <>
                                        <div className="lp-divider">
                                            <span>OR CONTINUE WITH</span>
                                        </div>

                                        <div className="lp-social">
                                            <button type="button" className="lp-socialbtn" onClick={loginWithGoogle}>
                                                Google
                                            </button>
                                            <button type="button" className="lp-socialbtn" onClick={loginWithGitHub}>
                                                GitHub
                                            </button>
                                        </div>
                                    </>
                                )}


                                {/* Sign up navigation */}
                                <div className="lp-forgot" style={{ marginTop: 14, justifyContent: "center" }}>
                                    <button type="button" className="lp-link" onClick={() => navigate("/signup")}>
                                        Don’t have an account? Sign up
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
