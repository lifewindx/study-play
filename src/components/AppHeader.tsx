import { NavLink } from "react-router-dom";
import { CalendarIcon, UserIcon } from "./Icons";

export function AppHeader() {
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
        <NavLink
          to="/classes"
          className="truncate text-base font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          StudyPlay
        </NavLink>

        <div className="flex items-center gap-2">
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
        </div>
      </div>
    </header>
  );
}
