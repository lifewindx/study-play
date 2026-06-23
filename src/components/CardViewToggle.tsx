import type { CardViewMode } from "../hooks/useCardViewMode";
import { Grid2Icon, Grid3Icon, ListIcon } from "./Icons";

interface CardViewToggleProps {
  value: CardViewMode;
  onChange: (mode: CardViewMode) => void;
}

export function CardViewToggle({ value, onChange }: CardViewToggleProps) {
  return (
    <div className="flex rounded-xl border p-1" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--surface-soft)" }}>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`icon-button h-8 w-8 ${value === "list" ? "icon-button-active" : ""}`}
        aria-label="List view"
        title="목록보기"
      >
        <ListIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("grid2")}
        className={`icon-button h-8 w-8 ${value === "grid2" ? "icon-button-active" : ""}`}
        aria-label="2 column view"
        title="2컬럼 보기"
      >
        <Grid2Icon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("grid3")}
        className={`icon-button h-8 w-8 ${value === "grid3" ? "icon-button-active" : ""}`}
        aria-label="3 column view"
        title="3컬럼 보기"
      >
        <Grid3Icon className="h-4 w-4" />
      </button>
    </div>
  );
}
