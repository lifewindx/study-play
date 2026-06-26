interface DifficultyRatingProps {
  value: number;
  onChange: (value: number) => void;
}

function clampRating(value: number): number {
  return Math.max(0, Math.min(5, Math.round(value)));
}

export function DifficultyStars({ value }: { value: number }) {
  const rating = clampRating(value);
  if (rating === 0) return null;

  return (
    <span className="flex shrink-0 items-center gap-px" aria-label={`난이도 ${rating}/5`} title={`난이도 ${rating}/5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className="text-xs leading-none"
          style={{ color: star <= rating ? "var(--warning)" : "var(--text-muted)" }}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  );
}

export function DifficultyRating({ value, onChange }: DifficultyRatingProps) {
  const rating = clampRating(value);

  return (
    <label className="toolbar-select" title="난이도">
      <span className="text-sm leading-none" style={{ color: rating > 0 ? "var(--warning)" : "var(--text-muted)" }} aria-hidden="true">
        ★
      </span>
      <select
        value={rating}
        onChange={(event) => onChange(clampRating(Number(event.target.value)))}
        className="toolbar-select-control"
        aria-label="레슨 난이도"
      >
        <option value={0}>난이도 없음</option>
        <option value={1}>★</option>
        <option value={2}>★★</option>
        <option value={3}>★★★</option>
        <option value={4}>★★★★</option>
        <option value={5}>★★★★★</option>
      </select>
    </label>
  );
}
