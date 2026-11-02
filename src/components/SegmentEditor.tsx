import { useEffect, useState } from "react";
import type { Segment } from "../types";
import { formatTimeMs, parseTimeInput } from "../lib/utils";

interface SegmentEditorProps {
  segment?: Segment;
  initialLabel?: string;
  initialStartTime?: number;
  initialEndTime?: number;
  isSaving?: boolean;
  onSave: (data: {
    label: string;
    start_time: number;
    end_time: number;
    loop_gap: number;
  }) => void | Promise<void>;
  onCancel: () => void;
  onPreviewChange?: (start: number, end: number) => void;
  draggedTimes?: { start: number; end: number } | null;
}

export function SegmentEditor({
  segment,
  initialLabel,
  initialStartTime = 0,
  initialEndTime = 10,
  isSaving = false,
  onSave,
  onCancel,
  onPreviewChange,
  draggedTimes,
}: SegmentEditorProps) {
  const [label, setLabel] = useState(segment?.label || initialLabel || "");
  const [startTime, setStartTime] = useState(
    segment ? formatTimeMs(segment.start_time) : formatTimeMs(initialStartTime)
  );
  const [endTime, setEndTime] = useState(
    segment ? formatTimeMs(segment.end_time) : formatTimeMs(initialEndTime)
  );
  const [loopGap, setLoopGap] = useState(segment?.loop_gap ? String(segment.loop_gap) : "0.0");

  useEffect(() => {
    if (!draggedTimes) return;
    setStartTime(formatTimeMs(draggedTimes.start));
    setEndTime(formatTimeMs(draggedTimes.end));
  }, [draggedTimes]);

  useEffect(() => {
    onPreviewChange?.(parseTimeInput(startTime), parseTimeInput(endTime));
  }, [startTime, endTime, onPreviewChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    const start = parseTimeInput(startTime);
    const end = parseTimeInput(endTime);
    if (end <= start) return;
    await onSave({
      label: label.trim(),
      start_time: start,
      end_time: end,
      loop_gap: Math.max(0, parseFloat(loopGap) || 0),
    });
  }

  function filterTimeInput(value: string): string {
    return value.replace(/[^0-9:. ]/g, "");
  }

  function filterNumberInput(value: string): string {
    return value.replace(/[^0-9.]/g, "");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-3 border p-4 ${segment ? "rounded-3xl" : "rounded-xl"}`}
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: segment ? "var(--accent)" : "var(--border-color)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {!segment && <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>New segment</div>}
      <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)]">
      <label className="col-span-2 block lg:col-span-1">
      <span className="mb-1 block pl-4 text-xs opacity-30" style={{ color: "var(--text-muted)" }}>Label</span>
      <input
        type="text"
        placeholder="Segment label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="input-field"
        maxLength={50}
        style={{
          backgroundColor: "var(--bg-primary)",
          borderColor: "var(--border-color)",
          color: "var(--text-primary)",
        }}
        autoFocus
      />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block pl-4 text-xs opacity-30" style={{ color: "var(--text-muted)" }}>
            Start time (m:s.ms)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={startTime}
            onChange={(e) => setStartTime(filterTimeInput(e.target.value))}
            className="input-field font-mono"
            style={{
              backgroundColor: "var(--bg-primary)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
            placeholder="0:00.00"
          />
        </div>
        <div>
          <label className="mb-1 block pl-4 text-xs opacity-30" style={{ color: "var(--text-muted)" }}>
            End time (m:s.ms)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={endTime}
            onChange={(e) => setEndTime(filterTimeInput(e.target.value))}
            className="input-field font-mono"
            style={{
              backgroundColor: "var(--bg-primary)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
            placeholder="0:10.00"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block pl-4 text-xs opacity-30" style={{ color: "var(--text-muted)" }}>
          Loop gap (seconds)
        </label>
        <input
          type="text"
          inputMode="decimal"
          pattern="[0-9.]*"
          min="0"
          value={loopGap}
          onChange={(e) => setLoopGap(filterNumberInput(e.target.value))}
          className="input-field"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border-color)",
            color: "var(--text-primary)",
          }}
        />
      </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost segment-form-button"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary segment-form-button"
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : `${segment ? "Update" : "Add"} Segment`}
        </button>
      </div>
    </form>
  );
}
