import { useState } from "react";
import type { Segment } from "../types";
import { formatTimeMs, parseTimeInput } from "../lib/utils";

interface SegmentEditorProps {
  segment?: Segment;
  onSave: (data: {
    label: string;
    start_time: number;
    end_time: number;
    loop_gap: number;
  }) => void;
  onCancel: () => void;
}

export function SegmentEditor({ segment, onSave, onCancel }: SegmentEditorProps) {
  const [label, setLabel] = useState(segment?.label ?? "");
  const [startTime, setStartTime] = useState(
    segment ? formatTimeMs(segment.start_time) : "0:00.00"
  );
  const [endTime, setEndTime] = useState(
    segment ? formatTimeMs(segment.end_time) : "0:10.00"
  );
  const [loopGap, setLoopGap] = useState(String(segment?.loop_gap ?? 0));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      label: label.trim(),
      start_time: parseTimeInput(startTime),
      end_time: parseTimeInput(endTime),
      loop_gap: parseFloat(loopGap) || 0,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-3xl border p-4"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border-color)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <input
        type="text"
        placeholder="Segment label (e.g., Intro riff)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="input-field"
        style={{
          backgroundColor: "var(--bg-primary)",
          borderColor: "var(--border-color)",
          color: "var(--text-primary)",
        }}
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            Start time (m:s.ms)
          </label>
          <input
            type="text"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
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
          <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            End time (m:s.ms)
          </label>
          <input
            type="text"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
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
        <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          Loop gap (seconds), 0 means seamless
        </label>
        <input
          type="number"
          min="0"
          step="0.1"
          value={loopGap}
          onChange={(e) => setLoopGap(e.target.value)}
          className="input-field"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border-color)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="btn-primary"
        >
          {segment ? "Update" : "Add"} Segment
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
