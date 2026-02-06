import React, { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Search, Moon, User, LayoutGrid, Sparkles, Star, UserCircle } from "lucide-react";
import "../pages/styles/layout.css";

export default function AppLayout() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div className="al-shell">
            {/* Header (FULL WIDTH) */}
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

                        <button className="al-iconBtn" type="button" title="Account">
                            <User size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Body: Sidebar + Main */}
            <div className="al-body">
                {/* Sidebar */}
                <aside className="al-sidebar">
                    <nav className="al-nav">
                        <NavLink to="/dashboard" className={({ isActive }) => `al-link ${isActive ? "isActive" : ""}`}>
                            <span className="al-linkIcon"><LayoutGrid size={18} /></span>
                            <span className="al-linkText">Dashboard</span>
                        </NavLink>

                        <NavLink to="/browse" className={({ isActive }) => `al-link ${isActive ? "isActive" : ""}`}>
                            <span className="al-linkIcon"><Sparkles size={18} /></span>
                            <span className="al-linkText">Browse</span>
                        </NavLink>

                        <NavLink to="/matches" className={({ isActive }) => `al-link ${isActive ? "isActive" : ""}`}>
                            <span className="al-linkIcon"><Star size={18} /></span>
                            <span className="al-linkText">Matches</span>
                        </NavLink>

                        <NavLink to="/profile" className={({ isActive }) => `al-link ${isActive ? "isActive" : ""}`}>
                            <span className="al-linkIcon"><UserCircle size={18} /></span>
                            <span className="al-linkText">Profile</span>
                        </NavLink>
                    </nav>

                    <div className="al-sidebarBottom">
                        <div className="al-userCard">
                            <div className="al-userAvatar">Z</div>
                            <div className="al-userMeta">
                                <div className="al-userName">Zenith</div>
                                <div className="al-userRole">Candidate</div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main */}
                <main className="al-main">
                    <div className="al-content">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Footer (FULL WIDTH) */}
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
