import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Briefcase, Users, Building2, Settings, Shield, LogOut } from "lucide-react";

const navItems = [
    { to: "/admin/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/recruiters", label: "Recruiters", icon: Briefcase },
    { to: "/admin/students", label: "Students", icon: Users },
    { to: "/admin/companies", label: "Companies", icon: Building2 },
];

export default function AdminLayout() {
    const navigate = useNavigate();

    const storedUser = JSON.parse(localStorage.getItem("jobify_user") || "{}");
    const adminEmail = storedUser?.email || "admin@jobify.com";

    const handleLogout = () => {
    localStorage.removeItem("jobify_token");
    localStorage.removeItem("jobify_user");
    navigate("/login", { replace: true });
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f3f4f6" }}>
            <aside
            style={{
                width: "260px",
                background: "linear-gradient(180deg, #0f172a 0%, #1e3a8a 100%)",
                color: "white",
                padding: "24px 18px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "sticky",
                top: 0,
                height: "100vh",
            }}>
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
                <div
                    style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(255,255,255,0.16)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    }}>
                    <Shield size={20} />
                </div>
                <div>
                    <div style={{ fontSize: "20px", fontWeight: 700 }}>Jobify</div>
                    <div style={{ fontSize: "13px", opacity: 0.8 }}>Admin Panel</div>
                </div>
                </div>

                <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            style={({ isActive }) => ({
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            textDecoration: "none",
                            color: "white",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            backgroundColor: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                            border: isActive ? "1px solid rgba(255,255,255,0.18)" : "1px solid transparent",
                            fontWeight: 600,
                            })}>
                            <Icon size={18} />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
                </nav>
            </div>

            <div>
                <div
                style={{
                    backgroundColor: "rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    padding: "14px",
                    marginBottom: "12px",
                }}>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>Admin</div>
                <div style={{ fontSize: "12px", opacity: 0.8 }}>{adminEmail}</div>
                </div>

                <button
                onClick={handleLogout}
                style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#ef4444",
                    color: "white",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                }}>
                <LogOut size={16} />
                Logout
                </button>
            </div>
            </aside>

            <main style={{ flex: 1 }}>
            <Outlet />
            </main>

        </div>
    );
}
