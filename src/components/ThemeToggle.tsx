import { useTheme } from "../hooks/useTheme";
import { MoonIcon, SunIcon } from "./Icons";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-8 w-14 items-center rounded-full p-1 transition-colors focus:outline-none"
      style={{
        backgroundColor: theme === "dark" ? "var(--bg-tertiary)" : "var(--surface-strong)",
      }}
      aria-label="Toggle theme"
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full transition-transform ${
          theme === "dark" ? "translate-x-6" : "translate-x-0"
        }`}
        style={{
          backgroundColor: "var(--accent)",
          color: "var(--accent-contrast)",
        }}
        aria-hidden="true"
      >
        {theme === "dark" ? <MoonIcon className="h-3.5 w-3.5" /> : <SunIcon className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}
