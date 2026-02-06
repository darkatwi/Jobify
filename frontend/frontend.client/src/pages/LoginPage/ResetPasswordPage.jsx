/**
 * ResetPasswordPage.jsx
 * ---------------------
 * Password reset page that completes the "forgot password" flow.
 *
 * Responsibilities:
 * - Read `email` and `token` from URL query params
 * - Validate new password (rules + confirm match)
 * - POST reset request to backend API
 * - Show success state once password is updated
 *
 * Notes:
 * - Uses Vite env var VITE_API_URL with localhost fallback
 * - Framer Motion is used for subtle UI animations
 * - FloatingIcons layer has pointerEvents disabled to avoid blocking clicks
 */

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    Eye,
    EyeOff,
    Moon,
    Sun,
    Loader2,
    Briefcase,
    GraduationCap,
    Code,
    Star,
    MapPin,
    Trophy,
    Lock,
    Users,
    Target,
    Building2,
} from "lucide-react";

import "../styles/login.css";

/**
 * Decorative floating icons displayed on the left panel.
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
 * Visual-only animated icons layer (aria-hidden).
 * pointerEvents: "none" ensures this layer never blocks form clicks.
 */
function FloatingIcons() {
    return (
        <div className="lp-floatwrap" aria-hidden="true" style={{ pointerEvents: "none" }}>
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
 * useQueryParams
 * --------------
 * Reads query params from the current URL once (memoized):
 * - token: password reset token sent by backend
 * - email: account email (typically included in reset link)
 */
function useQueryParams() {
    return useMemo(() => {
        const sp = new URLSearchParams(window.location.search);
        return {
            token: sp.get("token") || "",
            email: sp.get("email") || "",
        };
    }, []);
}

export default function ResetPasswordPage() {
    const navigate = useNavigate();

    /**
     * API base URL (Vite .env if exists, fallback if not)
     * Example: VITE_API_URL="https://localhost:7176"
     */
    const API_URL =
        (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
        "https://localhost:7176";

    /** Theme state (local UI only) */
    const [darkMode, setDarkMode] = useState(false);
    const toggleDarkMode = () => setDarkMode((d) => !d);

    /** Read token + email from URL */
    const { token, email } = useQueryParams();

    /** Form fields */
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    /** Password visibility toggles */
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    /** Request state */
    const [isLoading, setIsLoading] = useState(false);
    const [done, setDone] = useState(false);

    /** Field-level errors (token error is shown at top) */
    const [errors, setErrors] = useState({
        password: "",
        confirmPassword: "",
        token: "",
    });

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
     * Left-panel stats (visual only / social proof).
     */
    const stats = [
        { icon: Users, value: "10K+", label: "Candidates" },
        { icon: Briefcase, value: "2K+", label: "Opportunities" },
        { icon: Target, value: "85%", label: "Match Accuracy" },
        { icon: Building2, value: "500+", label: "Partner Organizations" },
    ];

    /** Helper to update a single error field */
    const setFieldError = (field, message) =>
        setErrors((prev) => ({ ...prev, [field]: message }));

    /**
     * Validates all inputs before submitting:
     * - token must exist (from email link)
     * - password must satisfy rules
     * - confirmPassword must match password
     */
    const validateAll = () => {
        let ok = true;

        if (!token) {
            setFieldError("token", "Missing reset token. Please use the link from your email.");
            ok = false;
        } else {
            setFieldError("token", "");
        }

        if (!password) {
            setFieldError("password", "Password is required");
            ok = false;
        } else {
            const msg = validatePassword(password);
            setFieldError("password", msg);
            if (msg) ok = false;
        }

        if (!confirmPassword) {
            setFieldError("confirmPassword", "Please confirm your password");
            ok = false;
        } else if (confirmPassword !== password) {
            setFieldError("confirmPassword", "Passwords do not match");
            ok = false;
        } else {
            setFieldError("confirmPassword", "");
        }

        return ok;
    };

    /**
     * Submit handler:
     * - Validates form
     * - Calls backend endpoint to reset password
     * - On success: shows confirmation UI
     * - On failure: displays backend message (usually token/validation error)
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateAll()) return;

        setIsLoading(true);
        setFieldError("token", "");

        try {
            const res = await fetch(`${API_URL}/api/Auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    token, // token is already URL-encoded from the link; backend is decoding it
                    newPassword: password,
                }),
            });

            if (!res.ok) {
                const text = await res.text();
                // show backend errors in the token error box (top)
                setFieldError("token", text || "Reset failed");
                throw new Error(text || "Reset failed");
            }

            setDone(true);
        } catch (err) {
            console.error(err);
            if (!errors.token) setFieldError("token", "Reset failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    /** Navigate back to login */
    const goLogin = () => {
        navigate("/login", { replace: true });
    };

    return (
        <div className={`lp-root ${darkMode ? "lp-dark" : ""}`}>
            <div className="lp-page">
                <div className="lp-grid">
                    {/* LEFT */}
                    <div className="lp-left">
                        <FloatingIcons />
                        <div className="lp-left-inner">
                            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                                <h1 className="lp-logo">Jobify</h1>
                                <p className="lp-tagline">Find opportunities that actually fit you.</p>
                            </motion.div>

                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }} className="lp-desc">
                                Choose a strong new password and get back to building your future.
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
                    </div>

                    {/* RIGHT */}
                    <div className="lp-right">
                        <div className="lp-card">
                            <div className="lp-darktoggle-desktop">
                                <button className="lp-iconbtn" onClick={toggleDarkMode} type="button" aria-label="Toggle theme">
                                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                                </button>
                            </div>

                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                                <div className="lp-welcome">
                                    <h2>Set a new password</h2>
                                    <p>{email ? `Resetting password for ${email}` : "Enter your new password below"}</p>
                                </div>

                                {errors.token && (
                                    <div className="lp-error" style={{ marginBottom: 12 }}>
                                        {errors.token}
                                    </div>
                                )}

                                {!done ? (
                                    <form onSubmit={handleSubmit} className="lp-form">
                                        <div className="lp-field">
                                            <label className="lp-label" htmlFor="password">
                                                New password
                                            </label>
                                            <div className="lp-password">
                                                <input
                                                    id="password"
                                                    className={`lp-input lp-input--padright ${errors.password ? "lp-input--error" : ""}`}
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="Enter a new password"
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
                                            {errors.password ? (
                                                <div className="lp-error">{errors.password}</div>
                                            ) : (
                                                <div className="lp-rolehint" style={{ marginTop: 6 }}>
                                                    Use 8+ chars, 1 uppercase, 1 number.
                                                </div>
                                            )}
                                        </div>

                                        <div className="lp-field">
                                            <label className="lp-label" htmlFor="confirmPassword">
                                                Confirm password
                                            </label>
                                            <div className="lp-password">
                                                <input
                                                    id="confirmPassword"
                                                    className={`lp-input lp-input--padright ${errors.confirmPassword ? "lp-input--error" : ""}`}
                                                    type={showConfirm ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="Repeat new password"
                                                    autoComplete="new-password"
                                                />
                                                <button
                                                    type="button"
                                                    className="lp-eye"
                                                    onClick={() => setShowConfirm((s) => !s)}
                                                    aria-label={showConfirm ? "Hide password" : "Show password"}
                                                >
                                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {errors.confirmPassword && <div className="lp-error">{errors.confirmPassword}</div>}
                                        </div>

                                        <button className="lp-submit" type="submit" disabled={isLoading}>
                                            {isLoading ? (
                                                <span className="lp-loading">
                                                    <Loader2 className="lp-spin" size={18} />
                                                    Updating password...
                                                </span>
                                            ) : (
                                                "Update password"
                                            )}
                                        </button>

                                        <div className="lp-forgot" style={{ display: "flex", justifyContent: "center" }}>
                                            <button type="button" className="lp-link" onClick={goLogin}>
                                                Back to sign in
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="lp-form">
                                        <div className="lp-field">
                                            <div className="lp-statcard" style={{ width: "100%" }}>
                                                <div className="lp-staticon">
                                                    <Lock size={18} />
                                                </div>
                                                <div>
                                                    <div className="lp-statvalue">Password updated</div>
                                                    <div className="lp-statlabel">You can now sign in with your new password.</div>
                                                </div>
                                            </div>
                                        </div>

                                        <button className="lp-submit" type="button" onClick={goLogin}>
                                            Go to sign in
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
