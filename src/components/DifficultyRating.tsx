import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

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
  const [draftValue, setDraftValue] = useState(clampRating(value));
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!draggingRef.current) setDraftValue(clampRating(value));
  }, [value]);

  function getValueFromPointer(event: ReactPointerEvent<HTMLDivElement>): number {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    return clampRating(Math.ceil(relativeX / (rect.width / 5)));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraftValue(getValueFromPointer(event));
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    setDraftValue(getValueFromPointer(event));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const nextValue = getValueFromPointer(event);
    draggingRef.current = false;
    setDraftValue(nextValue);
    onChange(nextValue);
  }

  function handlePointerCancel() {
    draggingRef.current = false;
    setDraftValue(clampRating(value));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    let nextValue: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") nextValue = clampRating(draftValue + 1);
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") nextValue = clampRating(draftValue - 1);
    if (event.key === "Home") nextValue = 0;
    if (event.key === "End") nextValue = 5;
    if (nextValue === null) return;

    event.preventDefault();
    setDraftValue(nextValue);
    onChange(nextValue);
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Lesson difficulty"
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={draftValue}
      aria-valuetext={`${draftValue} of 5 stars`}
      className="flex shrink-0 cursor-ew-resize select-none items-center gap-0.5 rounded-xl px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      style={{ touchAction: "none", backgroundColor: "var(--surface-soft)" }}
      title={`난이도 ${draftValue}/5 · 드래그해서 조절`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className="text-xl leading-none transition-colors"
          style={{ color: star <= draftValue ? "var(--warning)" : "var(--text-muted)" }}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );
}
