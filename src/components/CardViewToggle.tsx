import type { CardViewMode } from "../hooks/useCardViewMode";
import { Grid2Icon, Grid3Icon, ListIcon } from "./Icons";

interface CardViewToggleProps {
  value: CardViewMode;
  onChange: (mode: CardViewMode) => void;
}

export function CardViewToggle({ value, onChange }: CardViewToggleProps) {
  const CurrentIcon = value === "list" ? ListIcon : value === "grid2" ? Grid2Icon : Grid3Icon;

  return (
    <label className="toolbar-select" title="보기 방식">
      <CurrentIcon className="h-4 w-4 shrink-0" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as CardViewMode)}
        className="toolbar-select-control"
        aria-label="보기 방식"
      >
        <option value="list">목록</option>
        <option value="grid2">2컬럼</option>
        <option value="grid3">3컬럼</option>
      </select>
    </label>
  );
}
