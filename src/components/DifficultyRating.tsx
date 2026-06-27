import { useRef, useState } from "react";

interface DifficultyRatingProps {
  value: number;
  onChange: (value: number) => void;
}

const STARS = [1, 2, 3, 4, 5] as const;

function clampRating(value: number): number {
  return Math.max(0, Math.min(5, Math.round(value)));
}

export function DifficultyStars({ value }: { value: number }) {
  const rating = clampRating(value);
  if (rating === 0) return null;

  return (
    <span className="flex shrink-0 items-center gap-px" aria-label={`난이도 ${rating}/5`} title={`난이도 ${rating}/5`}>
      {STARS.slice(0, rating).map((star) => (
        <span
          key={star}
          className="text-xs leading-none"
          style={{ color: "var(--warning)" }}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  );
}

/**
 * Drag-to-set star rating.
 *
 * - Hover a star to preview the rating.
 * - Press and drag across the stars to scrub the value.
 * - Release to commit. Click the current rating to clear it to 0.
 * - Keyboard: focus a star and press Enter/Space to set, or press it again to clear.
 */
export function DifficultyRating({ value, onChange }: DifficultyRatingProps) {
  const rating = clampRating(value);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const dragStartValueRef = useRef(rating);
  const dragStartedOnValueRef = useRef(rating);
  const draggedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayValue = dragValue ?? hoverValue ?? rating;

  function starFromClientX(clientX: number): number {
    const container = containerRef.current;
    if (!container) return rating;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return rating;
    const ratio = (clientX - rect.left) / rect.width;
    return Math.max(1, Math.min(STARS.length, Math.floor(ratio * STARS.length) + 1));
  }

  function handlePointerDown(star: number, event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragStartValueRef.current = rating;
    dragStartedOnValueRef.current = star;
    draggedRef.current = false;
    setDragValue(star);
    setHoverValue(null);
    onChange(star);
    containerRef.current?.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragValue === null) return;
    const star = starFromClientX(event.clientX);
    if (star !== dragValue) {
      draggedRef.current = true;
      setDragValue(star);
      onChange(star);
    }
  }

  function handlePointerEnter(star: number) {
    if (dragValue !== null) return;
    setHoverValue(star);
  }

  function handlePointerLeave() {
    if (dragValue !== null) return;
    setHoverValue(null);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragValue === null) return;
    const wasDrag = draggedRef.current;
    const finalValue = dragValue;
    const startedOnCurrent = dragStartedOnValueRef.current === dragStartValueRef.current;
    setDragValue(null);
    setHoverValue(null);
    try {
      containerRef.current?.releasePointerCapture?.(event.pointerId);
    } catch {
      // Pointer may already be released; safe to ignore.
    }
    if (!wasDrag && finalValue === dragStartValueRef.current && startedOnCurrent) {
      onChange(0);
    }
  }

  function handleClick(star: number) {
    // Fires only from keyboard activation because pointerdown calls preventDefault.
    if (star === rating) {
      onChange(0);
    } else {
      onChange(star);
    }
  }

  return (
    <div
      ref={containerRef}
      className="inline-flex h-9 select-none items-center gap-0.5 rounded-xl px-1.5 transition-colors hover:bg-[var(--bg-tertiary)]"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      role="group"
      aria-label="난이도"
      title={`난이도 ${rating}/5${rating === 0 ? " — 클릭하여 설정" : ""}`}
    >
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          onPointerDown={(event) => handlePointerDown(star, event)}
          onPointerEnter={() => handlePointerEnter(star)}
          onClick={() => handleClick(star)}
          className="px-0.5 text-base leading-none transition-colors"
          style={{
            color: star <= displayValue ? "var(--warning)" : "var(--text-muted)",
          }}
          aria-label={`난이도 ${star}별`}
          aria-pressed={rating === star}
        >
          ★
        </button>
      ))}
    </div>
  );
}
