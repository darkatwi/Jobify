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
import { useTheme } from "../../layout/useTheme";
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

const floatingIcons = [
  { Icon: Briefcase, x: "8%", y: "10%", duration: 20 },
  { Icon: GraduationCap, x: "88%", y: "12%", duration: 25 },
  { Icon: Code, x: "10%", y: "78%", duration: 22 },
  { Icon: Star, x: "90%", y: "72%", duration: 18 },
  { Icon: MapPin, x: "78%", y: "88%", duration: 23 },
  { Icon: Trophy, x: "50%", y: "42%", duration: 21 },
];

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
  const navigate = useNavigate();

  const API_URL =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_URL) ||
    "http://localhost:5159";

  const loginWithGoogle = () => {
    window.location.href = `${API_URL}/api/Auth/external/Google`;
  };

  const loginWithGitHub = () => {
    window.location.href = `${API_URL}/api/Auth/external/GitHub`;
  };

  const { darkMode, setDarkMode } = useTheme();
  const toggleDarkMode = () => setDarkMode((d) => !d);

  const [userRole, setUserRole] = useState("candidate");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleEmailBlur = () => {
    if (email && !validateEmail(email))
      setEmailError("Please enter a valid email address");
    else setEmailError("");
  };

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

      const data = await res.json();

      localStorage.setItem("jobify_token", data.token);

      localStorage.setItem(
        "jobify_user",
        JSON.stringify({
          userId: data.userId,
          email: data.email,
          roles: data.roles,
          expiresAt: data.expiresAt,
        })
      );

      const roles = data.roles || [];
      const isRecruiter = roles.includes("Recruiter");

      if (isRecruiter) {
        navigate("/organization");
      } else {
        navigate("/dashboard");
      }

    } catch (err) {
      alert(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

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

  const topMatches = useMemo(
    () => [
      { percent: "85%", role: "Research Assistant", org: "University Lab" },
      { percent: "92%", role: "Frontend Intern", org: "Acme Labs" },
      { percent: "88%", role: "Data Analyst Intern", org: "Cedars Tech" },
    ],
    []
  );

  const [matchIndex, setMatchIndex] = useState(0);
  const prevIndexRef = useRef(0);

  useEffect(() => {
    prevIndexRef.current = matchIndex;
  }, [matchIndex]);

  useEffect(() => {
    if (userRole !== "candidate") return;

    const id = setInterval(() => {
      setMatchIndex((i) => (i + 1) % topMatches.length);
    }, 4000);

    return () => clearInterval(id);
  }, [userRole, topMatches.length]);

  useEffect(() => {
    setMatchIndex(0);
  }, [userRole]);

  const direction = matchIndex >= prevIndexRef.current ? 1 : -1;

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
              <h1 className="lp-logo">Jobify</h1>
              <p className="lp-tagline">Find opportunities that actually fit you.</p>

              <div className="lp-stats">
                {stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="lp-statcard">
                      <div className="lp-staticon">
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="lp-statvalue">{stat.value}</div>
                        <div className="lp-statlabel">{stat.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lp-right">
            <div className="lp-card">

              <button className="lp-iconbtn" onClick={toggleDarkMode}>
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div className="lp-roletoggle">
                <button
                  onClick={() => setUserRole("candidate")}
                  className={userRole === "candidate" ? "lp-rolebtn--active" : ""}
                >
                  Candidate
                </button>

                <button
                  onClick={() => setUserRole("recruiter")}
                  className={userRole === "recruiter" ? "lp-rolebtn--active" : ""}
                >
                  Recruiter
                </button>
              </div>

              <form onSubmit={handleSubmit} className="lp-form">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                />

                {emailError && <div className="lp-error">{emailError}</div>}

                <div className="lp-password">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <button className="lp-submit" type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="lp-spin" size={18} />
                      Signing in...
                    </>
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
                    <button onClick={loginWithGoogle}>Google</button>
                    <button onClick={loginWithGitHub}>GitHub</button>
                  </div>
                </>
              )}

              <button onClick={() => navigate("/signup")}>
                Don’t have an account? Sign up
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}