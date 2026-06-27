import { useEffect, useRef, useState } from "react";
import type { DifficultyFilter } from "../hooks/useCardViewMode";
import { CheckIcon, DifficultySortIcon } from "./Icons";

interface DifficultyFilterMenuProps {
  value: DifficultyFilter;
  onChange: (value: DifficultyFilter) => void;
}

const OPTIONS: Array<{ value: DifficultyFilter; label: string }> = [
  { value: "all", label: "전체 난이도" },
  { value: 1, label: "★" },
  { value: 2, label: "★★" },
  { value: 3, label: "★★★" },
  { value: 4, label: "★★★★" },
  { value: 5, label: "★★★★★" },
];

export function DifficultyFilterMenu({ value, onChange }: DifficultyFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-10 min-w-[6.75rem] items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors ${
          open ? "icon-button-active" : ""
        }`}
        style={!open ? { backgroundColor: "var(--surface-soft)", color: "var(--text-secondary)" } : undefined}
        aria-label="난이도 필터"
        aria-expanded={open}
        title="난이도 필터"
      >
        <DifficultySortIcon
          className="h-4 w-4 shrink-0"
          style={{ color: value !== "all" ? "var(--warning)" : undefined }}
        />
        <span style={{ color: value === "all" ? "inherit" : "var(--warning)" }}>
          {value === "all" ? "전체" : "★".repeat(value)}
        </span>
      </button>

      {open && (
        <div
          className="view-mode-menu absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border p-1.5 shadow-2xl"
          style={{ backgroundColor: "var(--surface-strong)", borderColor: "var(--border-color)" }}
          role="menu"
          aria-label="난이도 선택"
        >
          {OPTIONS.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{
                  color: option.value === "all" ? "var(--text-primary)" : "var(--warning)",
                  backgroundColor: selected ? "var(--accent-soft)" : undefined,
                }}
                aria-pressed={selected}
                role="menuitem"
              >
                <span className="tracking-wide">{option.label}</span>
                {selected && <CheckIcon className="h-4 w-4" style={{ color: "var(--accent)" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
