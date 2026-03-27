import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import "../pages/styles/admin.css";

const navItems = [
  { to: "/admin/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/recruiters", label: "Recruiters", icon: Briefcase },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/companies", label: "Companies", icon: Building2 },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const storedUser = JSON.parse(localStorage.getItem("jobify_user") || "{}");
  const adminEmail = storedUser?.email || "admin@jobify.com";

  const handleLogout = () => {
    localStorage.removeItem("jobify_token");
    localStorage.removeItem("jobify_user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-layout">
      <button
        className="admin-mobile-menu-btn"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu size={20} />
      </button>

      {sidebarOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div>
          <div className="admin-sidebar-top">
            <div className="admin-brand-icon">
              <Shield size={20} />
            </div>
            <div>
              <div className="admin-brand-title">Jobify</div>
              <div className="admin-brand-subtitle">Admin Panel</div>
            </div>

            <button
              className="admin-mobile-close-btn"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <nav className="admin-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `admin-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="admin-user-box">
            <div className="admin-user-role">Admin</div>
            <div className="admin-user-email">{adminEmail}</div>
          </div>

          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
