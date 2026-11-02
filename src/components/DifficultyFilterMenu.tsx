import { useEffect, useRef, useState } from "react";
import type { DifficultyFilter } from "../hooks/useCardViewMode";
import { CheckIcon } from "./Icons";

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
        className="inline-flex h-9 items-center justify-center gap-0 rounded-lg px-2 text-sm font-medium transition-colors"
        style={{ backgroundColor: "transparent", color: open ? "var(--toolbar-accent)" : "var(--text-muted)" }}
        aria-label="난이도 필터"
        aria-expanded={open}
        title="난이도 필터"
      >
        {Array.from({ length: value === "all" ? 1 : value }, (_, index) => (
          <svg key={index} className="h-4 w-4" viewBox="0 0 24 24" fill={value === "all" ? "none" : "currentColor"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" style={{ color: value !== "all" ? "var(--toolbar-accent)" : undefined }}>
            <path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.5-4.4 6.3-.9L12 3Z" />
          </svg>
        ))}
      </button>

      {open && (
        <div
          className="view-mode-menu absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border p-1.5 shadow-2xl"
          style={{ backgroundColor: "var(--menu-bg)", borderColor: "var(--border-color)" }}
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
