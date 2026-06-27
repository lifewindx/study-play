import { HeartIcon } from "./Icons";

interface FavoriteButtonProps {
  active: boolean;
  onChange: (active: boolean) => void;
  small?: boolean;
  bare?: boolean;
}

export function FavoriteButton({ active, onChange, small = false, bare = false }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      data-no-reorder
      onClick={(event) => {
        event.stopPropagation();
        onChange(!active);
      }}
      className={`icon-button shrink-0 ${small ? "h-6 w-6" : "h-10 w-10"} ${bare ? "justify-end hover:!bg-transparent" : ""}`}
      style={{
        color: active ? "var(--favorite)" : "var(--text-muted)",
        backgroundColor: !bare && active ? "var(--favorite-soft)" : undefined,
      }}
      aria-label={active ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      aria-pressed={active}
      title={active ? "즐겨찾기 해제" : "즐겨찾기 추가"}
    >
      <HeartIcon className={small && bare ? "h-3 w-3" : small ? "h-3.5 w-3.5" : "h-5 w-5"} style={{ fill: active ? "currentColor" : "none" }} />
    </button>
  );
}
