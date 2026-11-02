import { NavLink } from "react-router-dom";
import { CalendarIcon, UserIcon } from "./Icons";

export function AppHeader() {
  return (
    <header
      className="shrink-0"
      style={{ backgroundColor: "var(--header-bg)" }}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <NavLink
          to="/classes"
          className="brand-mark truncate text-xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          LOOPIN
        </NavLink>

        <nav className="header-nav flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
          <NavLink to="/classes" className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
            Classes
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `icon-button ${isActive ? "icon-button-active" : ""}`
            }
            aria-label="Calendar"
          >
            <CalendarIcon className="h-5 w-5" />
          </NavLink>
          <NavLink
            to="/mypage"
            className={({ isActive }) =>
              `icon-button ${isActive ? "icon-button-active" : ""}`
            }
            aria-label="My page"
          >
            <UserIcon className="h-5 w-5" />
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
