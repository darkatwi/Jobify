/**
 * ForgotPasswordPage.jsx
 * ----------------------
 * Handles the "Forgot Password" flow:
 * - Collects user email
 * - Validates email format
 * - Sends reset-password request to backend
 * - Shows success state once email is sent
 *
 * Notes:
 * - Uses environment-based API URL (VITE_API_URL) -change when u want to run
 * - Includes dark mode toggle (local UI state)
 * - Animated UI elements via Framer Motion
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    Moon,
    Sun,
    Loader2,
    Briefcase,
    GraduationCap,
    Code,
    Star,
    MapPin,
    Trophy,
    Mail,
    Users,
    Target,
    Building2,
} from "lucide-react";

import "../styles/login.css";

/**
 * Decorative floating icons used on the left side of the layout.
 * Each icon has a fixed position and animation duration.
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
 * Visual-only component that renders animated background icons.
 * Marked as aria-hidden since it provides no semantic value.
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
 * ForgotPasswordPage
 * ------------------
 * Main page component for requesting a password reset link.
 */
export default function ForgotPasswordPage() {
    const navigate = useNavigate();

    /** UI theme state (local only) */
    const [darkMode, setDarkMode] = useState(false);
    const toggleDarkMode = () => setDarkMode((d) => !d);

    /** Form & request state */
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);

    /**
     * Basic email validation using regex.
     * Keeps frontend validation lightweight.
     */
    const validateEmail = (value) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    /**
     * Validates email on blur to avoid noisy validation
     * while the user is typing.
     */
    const handleEmailBlur = () => {
        if (email && !validateEmail(email)) {
            setEmailError("Please enter a valid email address");
        } else {
            setEmailError("");
        }
    };

    /**
     * Static statistics shown on the left panel.
     * Purely informational / marketing content.
     */
    const stats = [
        { icon: Users, value: "10K+", label: "Candidates" },
        { icon: Briefcase, value: "2K+", label: "Opportunities" },
        { icon: Target, value: "85%", label: "Match Accuracy" },
        { icon: Building2, value: "500+", label: "Partner Organizations" },
    ];

    /**
     * Handles forgot-password form submission.
     * Sends a POST request to the backend with the user's email.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Frontend validation guard
        if (!validateEmail(email)) {
            setEmailError("Please enter a valid email address");
            return;
        }

        setIsLoading(true);
        setEmailError("");

        // API base URL loaded from environment variables
        const API_BASE = import.meta.env.VITE_API_URL;

        try {
            const res = await fetch(`${API_BASE}/api/Auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Request failed");
            }

            // Success state (email sent or account exists)
            setSent(true);
        } catch (err) {
            console.error(err);
            setEmailError(
                "Couldn't send reset link. Check backend URL / CORS / HTTPS."
            );
        } finally {
            setIsLoading(false);
        }
    };

    /** Navigates user back to the login page */
    const goLogin = () => {
        navigate("/login", { replace: true });
    };

    /**
     * Inline style used to center secondary link buttons.
     * This overrides existing flex rules in legacy CSS.
     */
    const centerLinkBtn = {
        display: "block",
        margin: "14px auto 0 auto",
        textAlign: "center",
    };

    return (
        <div className={`lp-root ${darkMode ? "lp-dark" : ""}`}>
            <div className="lp-page">
                <div className="lp-grid">
                    {/* LEFT PANEL — branding, stats, visuals */}
                    <div className="lp-left">
                        <FloatingIcons />

                        <div className="lp-left-inner">
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <h1 className="lp-logo">Jobify</h1>
                                <p className="lp-tagline">
                                    Find opportunities that actually fit you.
                                </p>
                            </motion.div>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.6 }}
                                className="lp-desc"
                            >
                                Forgot your password? No stress. We’ll send you a
                                reset link to get back in.
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
                                            transition={{
                                                delay: 0.15 + i * 0.08,
                                                duration: 0.5,
                                            }}
                                        >
                                            <div className="lp-staticon">
                                                <Icon size={18} />
                                            </div>
                                            <div>
                                                <div className="lp-statvalue">
                                                    {stat.value}
                                                </div>
                                                <div className="lp-statlabel">
                                                    {stat.label}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL — form & interactions */}
                    <div className="lp-right">
                        <div className="lp-card">
                            {/* Desktop-only dark mode toggle */}
                            <div className="lp-darktoggle-desktop">
                                <button
                                    className="lp-iconbtn"
                                    onClick={toggleDarkMode}
                                    type="button"
                                    aria-label="Toggle theme"
                                >
                                    {darkMode ? (
                                        <Sun size={18} />
                                    ) : (
                                        <Moon size={18} />
                                    )}
                                </button>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <div className="lp-welcome">
                                    <h2>Reset your password</h2>
                                    <p>
                                        Enter your email and we’ll send a reset
                                        link
                                    </p>
                                </div>

                                {/* FORM STATE */}
                                {!sent ? (
                                    <form
                                        onSubmit={handleSubmit}
                                        className="lp-form"
                                    >
                                        <div className="lp-field">
                                            <label
                                                className="lp-label"
                                                htmlFor="email"
                                            >
                                                Email
                                            </label>

                                            <div className="lp-password">
                                                <input
                                                    id="email"
                                                    className={`lp-input ${emailError
                                                            ? "lp-input--error"
                                                            : ""
                                                        }`}
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) =>
                                                        setEmail(e.target.value)
                                                    }
                                                    onBlur={handleEmailBlur}
                                                    placeholder="you@example.com"
                                                    autoComplete="email"
                                                />
                                                <div
                                                    className="lp-eye"
                                                    aria-hidden="true"
                                                >
                                                    <Mail size={18} />
                                                </div>
                                            </div>

                                            {emailError && (
                                                <div className="lp-error">
                                                    {emailError}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            className="lp-submit"
                                            type="submit"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <span className="lp-loading">
                                                    <Loader2
                                                        className="lp-spin"
                                                        size={18}
                                                    />
                                                    Sending link...
                                                </span>
                                            ) : (
                                                "Send reset link"
                                            )}
                                        </button>

                                        {/* Secondary navigation */}
                                        <button
                                            type="button"
                                            className="lp-link"
                                            onClick={goLogin}
                                            style={centerLinkBtn}
                                        >
                                            Back to sign in
                                        </button>
                                    </form>
                                ) : (
                                    /**
                                     * Success state:
                                     * Displayed after request completes successfully.
                                     */
                                    <div className="lp-form">
                                        <div className="lp-field">
                                            <div
                                                className="lp-statcard"
                                                style={{ width: "100%" }}
                                            >
                                                <div className="lp-staticon">
                                                    <Mail size={18} />
                                                </div>
                                                <div>
                                                    <div className="lp-statvalue">
                                                        Check your inbox
                                                    </div>
                                                    <div className="lp-statlabel">
                                                        If an account exists for{" "}
                                                        <b>{email}</b>, we sent a
                                                        reset link.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            className="lp-submit"
                                            type="button"
                                            onClick={() => setSent(false)}
                                        >
                                            Send again
                                        </button>

                                        <button
                                            type="button"
                                            className="lp-link"
                                            onClick={goLogin}
                                            style={centerLinkBtn}
                                        >
                                            Back to sign in
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
