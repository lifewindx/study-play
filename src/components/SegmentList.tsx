import type { Segment } from "../types";
import { formatTimeMs } from "../lib/utils";
import { usePointerReorder } from "../hooks/usePointerReorder";
import { SegmentEditor } from "./SegmentEditor";
import { PencilIcon, TrashIcon } from "./Icons";

interface SegmentListProps {
  segments: Segment[];
  activeSegmentId: number | null;
  editingSegmentId: number | null;
  onSelect: (segment: Segment) => void;
  onEdit: (segment: Segment) => void;
  onSaveEdit: (data: {
    label: string;
    start_time: number;
    end_time: number;
    loop_gap: number;
  }) => void;
  onCancelEdit: () => void;
  onDelete: (id: number) => void;
  onReorder?: (draggedId: number, targetId: number, placement: "before" | "after") => void;
}

export function SegmentList({
  segments,
  activeSegmentId,
  editingSegmentId,
  onSelect,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onReorder,
}: SegmentListProps) {
  const { draggingId: draggingSegmentId, startReorderDrag } = usePointerReorder((draggedId, targetId, placement) => {
    onReorder?.(draggedId, targetId, placement);
  }, "segments");

  if (segments.length === 0) {
    return (
      <p className="rounded-xl border py-8 text-center text-sm" style={{ color: "var(--text-muted)", borderColor: "var(--border-color)" }}>
        No segments. Add a segment to start practicing.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {segments.map((seg, idx) => {
        const isActive = seg.id === activeSegmentId;
        const isEditing = seg.id === editingSegmentId;
        const isDefaultAllSegment = seg.label === "All" && seg.start_time === 0;

        return (
          <div key={seg.id}>
            <div
              data-reorder-id={isEditing ? undefined : seg.id}
              data-reorder-scope={isEditing ? undefined : "segments"}
              onClick={() => { if (!isEditing) onSelect(seg); }}
              onPointerDown={(e) => {
                if (!isEditing) startReorderDrag(seg.id, e);
              }}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                isActive && !isEditing ? "ring-2" : ""
              } ${isEditing ? "rounded-b-none border-b-0" : ""} ${
                draggingSegmentId === seg.id ? "opacity-50" : ""
              }`}
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: isActive && !isEditing ? "var(--accent)" : "var(--border-color)",
              }}
            >
              <div className="flex-1 min-w-0" onClick={(e) => { if (isEditing) e.stopPropagation(); }}>
                <div className="flex items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 text-xs"
                    style={{
                      backgroundColor: isActive ? "var(--accent-soft)" : "var(--bg-tertiary)",
                      color: isActive ? "var(--accent)" : "var(--text-secondary)",
                    }}
                  >
                    {isDefaultAllSegment ? "Default" : `Segment ${idx + 1}`}
                  </span>
                  {seg.label && (
                    <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {seg.label}
                    </span>
                  )}
                </div>
                <div className="text-xs mt-1 font-mono" style={{ color: "var(--text-secondary)" }}>
                  {formatTimeMs(seg.start_time)} to {formatTimeMs(seg.end_time)}
                  {seg.loop_gap > 0 && <span className="ml-2">gap: {seg.loop_gap}s</span>}
                </div>
              </div>

              <div className="flex shrink-0 gap-1">
                {!isDefaultAllSegment && (
                  <button
                    data-no-reorder
                    onClick={(e) => { e.stopPropagation(); onEdit(seg); }}
                    className="icon-button"
                    style={{ color: isEditing ? "var(--accent)" : "var(--text-secondary)" }}
                    aria-label={isEditing ? "Close segment editor" : "Edit segment"}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                )}
                {!isEditing && !isDefaultAllSegment && (
                  <button
                    data-no-reorder
                    onClick={(e) => { e.stopPropagation(); onDelete(seg.id); }}
                    className="icon-button"
                    style={{ color: "var(--text-secondary)" }}
                    aria-label="Delete segment"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {isEditing && (
              <div
                className="border border-t-0 rounded-b-lg overflow-hidden"
                style={{ borderColor: "var(--border-color)" }}
              >
                <SegmentEditor
                  segment={seg}
                  onSave={onSaveEdit}
                  onCancel={onCancelEdit}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
