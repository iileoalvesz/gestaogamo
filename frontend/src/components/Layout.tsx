import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/equipment", label: "Equipamentos", icon: "🔧" },
  { to: "/upload", label: "Importar Certificado", icon: "📄" },
];

const adminItems = [{ to: "/users", label: "Usuários", icon: "👥" }];

export function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 240,
          background: "#1e3a5f",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "24px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>🏭 Gamon</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Controle de Qualidade</div>
        </div>

        <nav style={{ flex: 1, padding: "12px 0" }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                textDecoration: "none",
                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
                borderLeft: isActive ? "3px solid #60a5fa" : "3px solid transparent",
              })}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div style={{ padding: "16px 20px 4px", fontSize: 11, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1 }}>
                Admin
              </div>
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 20px",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                    textDecoration: "none",
                    background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                    fontWeight: isActive ? 600 : 400,
                    fontSize: 14,
                    borderLeft: isActive ? "3px solid #60a5fa" : "3px solid transparent",
                  })}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 13 }}>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>{user?.full_name || user?.username}</div>
          <div style={{ opacity: 0.6, fontSize: 12, marginBottom: 10 }}>
            {user?.role === "admin" ? "Administrador" : "Analista"}
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              padding: "6px 12px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
              width: "100%",
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, background: "#f8fafc", overflowY: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
