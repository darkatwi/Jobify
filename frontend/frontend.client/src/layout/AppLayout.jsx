import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    Search,
    Moon,
    User,
    LayoutGrid,
    Sparkles,
    Star,
    UserCircle,
    Building2,
} from "lucide-react";
import { api } from "../api/api";
import "../pages/styles/layout.css";

export default function AppLayout() {
    const navigate = useNavigate();

    const [scrolled, setScrolled] = useState(false);
    const [role, setRole] = useState(null);
    const [displayName, setDisplayName] = useState("Loading...");
    const [avatarLetter, setAvatarLetter] = useState("?");
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState("");
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const profileMenuRef = useRef(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                profileMenuRef.current &&
                !profileMenuRef.current.contains(event.target)
            ) {
                setShowProfileMenu(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
//use effect
    useEffect(() => {
        async function fetchProfile() {
            try {
                setLoadingProfile(true);
                setProfileError("");

                const res = await api.get("/api/Profile");
                const data = res.data;

                console.log("PROFILE DATA:", data);
                console.log("ROLE:", data?.role);

                const userRole = data?.role ?? null;
                setRole(userRole);

                if (userRole === "Recruiter") {
                    const company = data?.profile?.companyName || "Recruiter";
                    setDisplayName(company);
                    setAvatarLetter(company.charAt(0)?.toUpperCase() || "R");
                } else if (userRole === "Student") {
                    const fullName = data?.profile?.fullName || "Student";
                    setDisplayName(fullName);
                    setAvatarLetter(fullName.charAt(0)?.toUpperCase() || "S");
                } else {
                    setDisplayName("Unknown User");
                    setAvatarLetter("?");
                    setProfileError("Profile role was not recognized.");
                }
            } catch (error) {
                console.error("Failed to load profile in layout:", error);
                setProfileError("Failed to load profile.");
                setRole(null);
                setDisplayName("Profile Error");
                setAvatarLetter("!");
            } finally {
                setLoadingProfile(false);
            }
        }

        fetchProfile();
    }, []);
//top buttun
    function handleLogout() {
        setShowProfileMenu(false);
        localStorage.removeItem("token");
        localStorage.removeItem("jobify_user");
        localStorage.removeItem("jobify_signup");
        navigate("/login");
    }
//handle go to profile option
    function handleGoToProfile() {
        setShowProfileMenu(false);
        navigate("/profile");
    }

    return (
        <div className="al-shell">
            <header className={`al-header ${scrolled ? "isScrolled" : ""}`}>
                <div className="al-headerInner">
                    <div className="al-headerSide al-left">
                        <div className="al-logo">Jobify</div>
                    </div>

                    <div className="al-headerCenter">
                        <div className="al-search">
                            <Search className="al-searchIcon" size={18} />
                            <input placeholder="Quick search: pages, users, settings… (Ctrl K)" />
                            <kbd className="al-kbd">Ctrl K</kbd>
                        </div>
                    </div>

                    <div className="al-headerSide al-right">
                        <button className="al-iconBtn" type="button" title="Toggle theme">
                            <Moon size={18} />
                        </button>

                        <div
                            ref={profileMenuRef}
                            style={{ position: "relative", display: "inline-block" }}
                        >
                            <button
                                className="al-iconBtn"
                                type="button"
                                title="Account"
                                onClick={() => setShowProfileMenu((prev) => !prev)}
                            >
                                <User size={18} />
                            </button>

                            {showProfileMenu && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "48px",
                                        right: 0,
                                        width: "170px",
                                        background: "white",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "12px",
                                        boxShadow: "0 10px 24px rgba(0,0,0,0.10)",
                                        padding: "8px",
                                        zIndex: 1000,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "6px",
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={handleGoToProfile}
                                        style={menuItemStyle}
                                    >
                                        Profile
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        style={menuItemStyle}
                                    >
                                        Log out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="al-body">
                <aside className="al-sidebar">
                    <nav className="al-nav">
                        <NavLink
                            to="/dashboard"
                            className={({ isActive }) => `al-link ${isActive ? "isActive" : ""}`}
                        >
                            <span className="al-linkIcon"><LayoutGrid size={18} /></span>
                            <span className="al-linkText">Dashboard</span>
                        </NavLink>

                        <NavLink
                            to="/browse"
                            className={({ isActive }) => `al-link ${isActive ? "isActive" : ""}`}
                        >
                            <span className="al-linkIcon"><Sparkles size={18} /></span>
                            <span className="al-linkText">Browse</span>
                        </NavLink>

                        {!loadingProfile && role === "Recruiter" && (
                            <NavLink
                                to="/organization"
                                className={({ isActive }) => `al-link ${isActive ? "isActive" : ""}`}
                            >
                                <span className="al-linkIcon"><Building2 size={18} /></span>
                                <span className="al-linkText">Organization</span>
                            </NavLink>
                        )}

                        {!loadingProfile && role === "Student" && (
                            <NavLink
                                to="/match"
                                className={({ isActive }) => `al-link ${isActive ? "isActive" : ""}`}
                            >
                                <span className="al-linkIcon"><Star size={18} /></span>
                                <span className="al-linkText">Matches</span>
                            </NavLink>
                        )}

                        <NavLink
                            to="/profile"
                            className={({ isActive }) => `al-link ${isActive ? "isActive" : ""}`}
                        >
                            <span className="al-linkIcon"><UserCircle size={18} /></span>
                            <span className="al-linkText">Profile</span>
                        </NavLink>
                    </nav>

                    <div className="al-sidebarBottom">
                        <div className="al-userCard">
                            <div className="al-userAvatar">{avatarLetter}</div>
                            <div className="al-userMeta">
                                <div className="al-userName">{displayName}</div>
                                <div className="al-userRole">
                                    {loadingProfile ? "Loading..." : role || "Unknown"}
                                </div>
                                {profileError && (
                                    <div style={{ color: "red", fontSize: "12px" }}>
                                        {profileError}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="al-main">
                    <div className="al-content">
                        <Outlet />
                    </div>
                </main>
            </div>

            <footer className="al-footer">
                <div className="al-footerInner">
                    <div>
                        <div className="al-footerBrand">Jobify</div>
                        <p className="al-footerText">
                            Smart matching platform connecting talent with opportunities through AI-powered recommendations.
                        </p>
                    </div>

                    <div className="al-footerCols">
                        <div>
                            <div className="al-footerTitle">Company</div>
                            <ul className="al-footerList">
                                <li>About Us</li>
                                <li>Careers</li>
                                <li>Contact</li>
                            </ul>
                        </div>

                        <div>
                            <div className="al-footerTitle">Legal</div>
                            <ul className="al-footerList">
                                <li>Terms of Service</li>
                                <li>Privacy Policy</li>
                                <li>Cookie Policy</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="al-footerBottom">© 2026 Jobify. All rights reserved.</div>
            </footer>
        </div>
    );
}

const menuItemStyle = {
    border: "none",
    background: "white",
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
    color: "#111827",
};