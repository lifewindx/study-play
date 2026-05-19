import { NavLink } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../hooks/useAuth";
import { UserIcon } from "./Icons";

const navItems = [
  { to: "/classes", label: "Library" },
  { to: "/calendar", label: "Calendar" },
];

export function AppHeader() {
  const { user } = useAuth();

  return (
    <header
      className="shrink-0 border-b"
      style={{
        backgroundColor: "var(--header-bg)",
        borderColor: "var(--border-color)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <NavLink to="/classes" className="flex min-w-0 items-center gap-3">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: "var(--accent)" }}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              StudyPlay
            </div>
            <div className="truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
              {user?.email ?? "Loop practice desk"}
            </div>
          </div>
        </NavLink>

        <nav className="flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--surface-soft)" }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/classes"}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NavLink
            to="/mypage"
            className="icon-button"
            aria-label="My page"
          >
            <UserIcon className="h-5 w-5" />
          </NavLink>
        </div>
      </div>
    </header>
  );
}
