import { useEffect, useRef, useState } from "react";
import type { CardViewMode } from "../hooks/useCardViewMode";
import { Grid2Icon, Grid3Icon, ListIcon } from "./Icons";

interface CardViewToggleProps {
  value: CardViewMode;
  onChange: (mode: CardViewMode) => void;
}

export function CardViewToggle({ value, onChange }: CardViewToggleProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const CurrentIcon = value === "list" ? ListIcon : value === "grid2" ? Grid2Icon : Grid3Icon;
  const options = [
    { value: "list" as const, label: "목록", Icon: ListIcon },
    { value: "grid2" as const, label: "2컬럼", Icon: Grid2Icon },
    { value: "grid3" as const, label: "3컬럼", Icon: Grid3Icon },
  ];

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
        className={`icon-button h-10 w-10 ${open ? "icon-button-active" : ""}`}
        aria-label="보기 방식"
        aria-expanded={open}
        title="보기 방식"
      >
        <CurrentIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="view-mode-menu absolute right-0 top-full z-30 mt-2 flex origin-top-right gap-1 rounded-xl border p-1.5 shadow-xl"
          style={{ backgroundColor: "var(--surface-strong)", borderColor: "var(--border-color)" }}
          role="menu"
          aria-label="보기 방식 선택"
        >
          {options.map(({ value: optionValue, label, Icon }) => (
            <button
              key={optionValue}
              type="button"
              onClick={() => {
                onChange(optionValue);
                setOpen(false);
              }}
              className={`icon-button h-9 w-9 ${value === optionValue ? "icon-button-active" : ""}`}
              aria-label={label}
              aria-pressed={value === optionValue}
              title={label}
              role="menuitem"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
