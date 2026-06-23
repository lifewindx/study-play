import { HeartIcon } from "./Icons";

interface FavoriteButtonProps {
  active: boolean;
  onChange: (active: boolean) => void;
  small?: boolean;
}

export function FavoriteButton({ active, onChange, small = false }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      data-no-reorder
      onClick={(event) => {
        event.stopPropagation();
        onChange(!active);
      }}
      className={`icon-button shrink-0 ${small ? "h-7 w-7" : "h-10 w-10"}`}
      style={{
        color: active ? "var(--favorite)" : "var(--text-muted)",
        backgroundColor: active ? "var(--favorite-soft)" : undefined,
      }}
      aria-label={active ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      aria-pressed={active}
      title={active ? "즐겨찾기 해제" : "즐겨찾기 추가"}
    >
      <HeartIcon className={small ? "h-4 w-4" : "h-5 w-5"} style={{ fill: active ? "currentColor" : "none" }} />
    </button>
  );
}
