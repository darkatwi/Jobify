/**
 * SignupPage.jsx
 * --------------
 * Registration page for Jobify.
 *
 * Supports two user types:
 * - Candidate: creates a personal account
 * - Recruiter: creates an organization account
 *
 * Responsibilities:
 * - Role toggle (candidate / recruiter)
 * - Client-side validation (required fields, email, password rules)
 * - POST /api/Auth/register to backend
 * - Store basic signup context in localStorage for later onboarding
 *
 * UI Notes:
 * - Uses Framer Motion for animations
 * - Uses Lucide icons for consistent UI
 * - Uses Vite env var VITE_API_URL with a localhost fallback
 */

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
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
    User,
    Building,
    Mail,
} from "lucide-react";

import "../styles/login.css";

/**
 * Decorative floating icons used for the left panel background.
 * Each icon is positioned absolutely and animated continuously.
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
 * Visual-only component (aria-hidden) to render animated icons.
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

/**
 * SignupPage
 * ----------
 * Main registration page component.
 */
export default function SignupPage() {
    const navigate = useNavigate();

    /**
     * API base URL (Vite .env)
     * Example: VITE_API_URL="https://localhost:7176"
     * Fallback to localhost for dev convenience.
     */
    const API_URL =
        (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
        "https://localhost:7176";

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

    /** Role selection controls which fields are shown and validated */
    const [userRole, setUserRole] = useState("candidate");

    // Candidate fields
    const [fullName, setFullName] = useState("");

    // Recruiter fields
    const [companyName, setCompanyName] = useState("");

    // ✅ Recruiter verification links (at least 1 required for recruiters)
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [instagramUrl, setInstagramUrl] = useState("");

    // Shared fields (email/password)
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    /** Password visibility toggle */
    const [showPassword, setShowPassword] = useState(false);

    /** Loading state to disable submit button & show spinner */
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Form errors (field-level).
     * Keeping all errors in one object makes it easy to display and update.
     */
    const [errors, setErrors] = useState({
        fullName: "",
        companyName: "",
        websiteUrl: "",
        email: "",
        password: "",
    });

    /** Basic email regex validation */
    const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    /**
     * Password validation rules:
     * - 8+ characters
     * - 1 uppercase letter
     * - 1 number
     */
    const validatePassword = (value) => {
        if (value.length < 8) return "Password must be at least 8 characters";
        if (!/[A-Z]/.test(value)) return "Add at least 1 uppercase letter";
        if (!/[0-9]/.test(value)) return "Add at least 1 number";
        return "";
    };

    /**
     * Left-panel stats shown for social proof.
     * Content changes depending on userRole.
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

    /** Hint text (memoized since it never changes) */
    const passwordHint = useMemo(() => "Use 8+ chars, 1 uppercase, 1 number.", []);

    /** Utility helper to update a specific field error */
    const setFieldError = (field, message) => setErrors((prev) => ({ ...prev, [field]: message }));

    /**
     * Field validation onBlur:
     * - avoids showing errors while user is still typing
     * - provides immediate feedback once they leave a field
     */
    const handleBlur = (field) => {
        if (field === "fullName") {
            if (!fullName.trim()) setFieldError("fullName", "Full name is required");
            else setFieldError("fullName", "");
        }

        if (field === "companyName") {
            if (!companyName.trim()) setFieldError("companyName", "Company name is required");
            else setFieldError("companyName", "");
        }

        if (field === "email") {
            if (!email)
                setFieldError(
                    "email",
                    userRole === "recruiter" ? "Company email is required" : "Email is required"
                );
            else if (!validateEmail(email)) setFieldError("email", "Please enter a valid email address");
            else setFieldError("email", "");
        }

        if (field === "password") {
            if (!password) setFieldError("password", "Password is required");
            else setFieldError("password", validatePassword(password));
        }
    };

    /**
     * Validate the entire form before submitting.
     * Returns true only if all required fields are valid.
     */
    const validateAll = () => {
        let ok = true;

        // Role-specific required fields
        if (userRole === "candidate") {
            if (!fullName.trim()) {
                setFieldError("fullName", "Full name is required");
                ok = false;
            } else setFieldError("fullName", "");
            setFieldError("companyName", "");
            setFieldError("websiteUrl", "");
        } else {
            if (!companyName.trim()) {
                setFieldError("companyName", "Company name is required");
                ok = false;
            } else setFieldError("companyName", "");
            setFieldError("fullName", "");

            // ✅ Recruiter must provide at least 1 link
            const hasAnyLink =
                !!websiteUrl.trim() || !!linkedinUrl.trim() || !!instagramUrl.trim();

            if (!hasAnyLink) {
                setFieldError("websiteUrl", "Provide at least one link (Website, LinkedIn, or Instagram).");
                ok = false;
            } else {
                setFieldError("websiteUrl", "");
            }
        }

        // Email
        if (!email) {
            setFieldError("email", userRole === "recruiter" ? "Company email is required" : "Email is required");
            ok = false;
        } else if (!validateEmail(email)) {
            setFieldError("email", "Please enter a valid email address");
            ok = false;
        } else {
            setFieldError("email", "");
        }

        // Password
        if (!password) {
            setFieldError("password", "Password is required");
            ok = false;
        } else {
            const msg = validatePassword(password);
            if (msg) ok = false;
            setFieldError("password", msg);
        }

        return ok;
    };

    /**
     * Submit handler:
     * - Validates all fields
     * - Sends POST request to /api/Auth/register
     * - Saves basic signup info to localStorage (optional onboarding)
     * - Redirects to login on success
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateAll()) return;

        try {
            setIsLoading(true);

            const res = await fetch(`${API_URL}/api/Auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    // Backend role mapping: Recruiter vs Student
                    role: userRole === "recruiter" ? "Recruiter" : "Student",
                    // ✅ FIX: send companyName for recruiter registration
                    companyName: userRole === "recruiter" ? companyName : null,
                    websiteUrl: userRole === "recruiter" ? websiteUrl : null,
                    linkedinUrl: userRole === "recruiter" ? linkedinUrl : null,
                    instagramUrl: userRole === "recruiter" ? instagramUrl : null,
                }),
            });

            // Handle error responses gracefully (JSON or text)
            if (!res.ok) {
                const contentType = res.headers.get("content-type") || "";
                let msg = "Signup failed";

                if (contentType.includes("application/json")) {
                    const data = await res.json();
                    if (data?.errors) {
                        msg = Object.values(data.errors).flat().join("\n");
                    } else {
                        msg = JSON.stringify(data);
                    }
                } else {
                    msg = await res.text();
                }

                throw new Error(msg || "Signup failed");
            }

            /**
             * Store signup context to potentially pre-fill profile setup later.
             * Safe to remove if not needed for your flow.
             */
            localStorage.setItem(
                "jobify_signup",
                JSON.stringify({
                    userRole,
                    fullName: userRole === "candidate" ? fullName : "",
                    companyName: userRole === "recruiter" ? companyName : "",
                    email,
                })
            );

            alert("Account created successfully! Please sign in.");
            navigate("/login", { replace: true });
        } catch (err) {
            alert(err.message || "Signup failed");
        } finally {
            setIsLoading(false);
        }
    };

    /** Navigation helper */
    const goLogin = () => navigate("/login", { replace: true });

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
                                Create your account and start matching with opportunities based on skills, interests,
                                and experience.
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
                        </div>

                        {/* ✅ FULL WIDTH SECTION (spans all left panel) */}
                        <div className="lp-left-wide">
                            <div className="lp-signup-note" role="note" aria-live="polite">

                                <div>
                                    {userRole === "recruiter" ? (
                                        <>
                                            <div className="lp-signup-note-title">What happens next?</div>
                                            <div className="lp-signup-note-text">
                                                We’ll email you a confirmation and submit your organization for admin review.
                                                Once approved, you’ll be able to post jobs and manage applications.
                                            </div>
                                            <div className="lp-signup-note-subtle">
                                                Approval is usually quick. You’ll get an email once it’s done.
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="lp-signup-note-title">Next steps</div>
                                            <div className="lp-signup-note-text">
                                                After signing up, we’ll assess your profile to improve matching and recommendations.
                                                You can start exploring opportunities right away.
                                            </div>
                                            <div className="lp-signup-note-subtle">
                                                Your data is used only to enhance your Jobify experience.
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* RIGHT PANEL: Form */}
                    <div className="lp-right">
                        <div className="lp-card">
                            {/* Desktop theme toggle */}
                            <div className="lp-darktoggle-desktop">
                                <button
                                    className="lp-iconbtn"
                                    onClick={toggleDarkMode}
                                    type="button"
                                    aria-label="Toggle theme"
                                >
                                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                                </button>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                {/* Role toggle controls which fields/stats are shown */}
                                <div className="lp-roletoggle">
                                    <div className="lp-roletoggle-wrap">
                                        <button
                                            type="button"
                                            onClick={() => setUserRole("candidate")}
                                            className={`lp-rolebtn ${userRole === "candidate" ? "lp-rolebtn--active" : ""
                                                }`}
                                        >
                                            Candidate
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUserRole("recruiter")}
                                            className={`lp-rolebtn ${userRole === "recruiter" ? "lp-rolebtn--active" : ""
                                                }`}
                                        >
                                            Recruiter
                                        </button>
                                    </div>

                                    <p className="lp-rolehint">
                                        {userRole === "candidate"
                                            ? "Create a candidate profile and start matching"
                                            : "Create an organization account and post opportunities"}
                                    </p>
                                </div>

                                <div className="lp-welcome">
                                    <h2>Create account</h2>
                                    <p>Join Jobify in less than a minute</p>
                                </div>

                                <form onSubmit={handleSubmit} className="lp-form">
                                    {/* Role-specific name field */}
                                    {userRole === "candidate" ? (
                                        <div className="lp-field">
                                            <label className="lp-label" htmlFor="fullName">
                                                Full name
                                            </label>
                                            <div className="lp-password">
                                                <input
                                                    id="fullName"
                                                    className={`lp-input ${errors.fullName ? "lp-input--error" : ""}`}
                                                    type="text"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    onBlur={() => handleBlur("fullName")}
                                                    placeholder="Your name"
                                                    autoComplete="name"
                                                />
                                                <div className="lp-eye" aria-hidden="true">
                                                    <User size={18} />
                                                </div>
                                            </div>
                                            {errors.fullName && <div className="lp-error">{errors.fullName}</div>}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="lp-field">
                                                <label className="lp-label" htmlFor="companyName">
                                                    Company name
                                                </label>
                                                <div className="lp-password">
                                                    <input
                                                        id="companyName"
                                                        className={`lp-input ${errors.companyName ? "lp-input--error" : ""}`}
                                                        type="text"
                                                        value={companyName}
                                                        onChange={(e) => setCompanyName(e.target.value)}
                                                        onBlur={() => handleBlur("companyName")}
                                                        placeholder="Company / Organization name"
                                                        autoComplete="organization"
                                                    />
                                                    <div className="lp-eye" aria-hidden="true">
                                                        <Building size={18} />
                                                    </div>
                                                </div>
                                                {errors.companyName && <div className="lp-error">{errors.companyName}</div>}
                                            </div>

                                            {/* ✅ Recruiter verification links */}
                                            <div className="lp-field">
                                                <label className="lp-label" htmlFor="websiteUrl">
                                                    Website / LinkedIn / Instagram (at least 1)
                                                </label>

                                                <input
                                                    id="websiteUrl"
                                                    className={`lp-input ${errors.websiteUrl ? "lp-input--error" : ""}`}
                                                    type="url"
                                                    value={websiteUrl}
                                                    onChange={(e) => setWebsiteUrl(e.target.value)}
                                                    placeholder="https://company.com"
                                                    autoComplete="url"
                                                />

                                                <div style={{ marginTop: 10 }}>
                                                    <input
                                                        className={`lp-input ${errors.websiteUrl ? "lp-input--error" : ""}`}
                                                        type="url"
                                                        value={linkedinUrl}
                                                        onChange={(e) => setLinkedinUrl(e.target.value)}
                                                        placeholder="https://linkedin.com/company/..."
                                                        autoComplete="url"
                                                    />
                                                </div>

                                                <div style={{ marginTop: 10 }}>
                                                    <input
                                                        className={`lp-input ${errors.websiteUrl ? "lp-input--error" : ""}`}
                                                        type="url"
                                                        value={instagramUrl}
                                                        onChange={(e) => setInstagramUrl(e.target.value)}
                                                        placeholder="https://instagram.com/..."
                                                        autoComplete="url"
                                                    />
                                                </div>

                                                {errors.websiteUrl && <div className="lp-error">{errors.websiteUrl}</div>}
                                            </div>
                                        </>
                                    )}

                                    {/* Email */}
                                    <div className="lp-field">
                                        <label className="lp-label" htmlFor="email">
                                            {userRole === "recruiter" ? "Company email" : "Email"}
                                        </label>

                                        <div className="lp-password">
                                            <input
                                                id="email"
                                                className={`lp-input ${errors.email ? "lp-input--error" : ""}`}
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                onBlur={() => handleBlur("email")}
                                                placeholder={
                                                    userRole === "recruiter" ? "hr@company.com" : "you@example.com"
                                                }
                                                autoComplete="email"
                                            />
                                            <div className="lp-eye" aria-hidden="true">
                                                <Mail size={18} />
                                            </div>
                                        </div>

                                        {errors.email && <div className="lp-error">{errors.email}</div>}
                                    </div>

                                    {/* Password */}
                                    <div className="lp-field">
                                        <label className="lp-label" htmlFor="password">
                                            Password
                                        </label>
                                        <div className="lp-password">
                                            <input
                                                id="password"
                                                className={`lp-input lp-input--padright ${errors.password ? "lp-input--error" : ""
                                                    }`}
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                onBlur={() => handleBlur("password")}
                                                placeholder="Create a password"
                                                autoComplete="new-password"
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

                                        {!!passwordHint && !errors.password && (
                                            <div className="lp-rolehint" style={{ marginTop: 6 }}>
                                                {passwordHint}
                                            </div>
                                        )}
                                        {errors.password && <div className="lp-error">{errors.password}</div>}
                                    </div>

                                    {/* Submit */}
                                    <button className="lp-submit" type="submit" disabled={isLoading}>
                                        {isLoading ? (
                                            <span className="lp-loading">
                                                <Loader2 className="lp-spin" size={18} />
                                                Creating account...
                                            </span>
                                        ) : (
                                            "Sign up"
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


                                <div className="lp-forgot" style={{ marginTop: 14, justifyContent: "center" }}>
                                    <button type="button" className="lp-link" onClick={goLogin}>
                                        Already have an account? Sign in
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
