import type { Segment } from "../types";
import { TimeDisplay } from "./TimeDisplay";
import { usePointerReorder } from "../hooks/usePointerReorder";
import { SegmentEditor } from "./SegmentEditor";
import { PencilIcon, XIcon } from "./Icons";

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
  onPreviewChange?: (start: number, end: number) => void;
  draggedTimes?: { start: number; end: number } | null;
  locked?: boolean;
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
  onPreviewChange,
  draggedTimes,
  locked = false,
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

        if (isEditing) {
          return (
            <SegmentEditor
              key={seg.id}
              segment={seg}
              initialLabel={seg.label || `S${segments.slice(0, idx + 1).filter((item) => !(item.label === "All" && item.start_time === 0)).length}`}
              onPreviewChange={onPreviewChange}
              draggedTimes={draggedTimes}
              onSave={onSaveEdit}
              onCancel={onCancelEdit}
            />
          );
        }

        return (
          <div key={seg.id}>
            <div
              data-reorder-id={locked ? undefined : seg.id}
              data-reorder-scope={locked ? undefined : "segments"}
              onClick={() => { if (!locked) onSelect(seg); }}
              onPointerDown={(e) => {
                if (!locked) startReorderDrag(seg.id, e);
              }}
              aria-disabled={locked}
              className={`relative flex min-h-12 items-center gap-3 border px-6 py-2 transition-colors ${locked ? "cursor-default opacity-50" : "cursor-pointer"} ${
                isEditing ? "rounded-t-xl border-b-0" : "rounded-full"
              } ${
                draggingSegmentId === seg.id ? "opacity-50" : ""
              }`}
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: isActive && !isEditing ? "var(--accent)" : "var(--border-color)",
              }}
            >
              <div className="flex-1 min-w-0" onClick={(e) => { if (isEditing) e.stopPropagation(); }}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-medium sm:max-w-[35%]" style={{ color: "var(--text-primary)" }}>
                      {seg.label || `S${segments.slice(0, idx + 1).filter((item) => !(item.label === "All" && item.start_time === 0)).length}`}
                    </span>
                <span className="text-xs font-mono sm:absolute sm:left-1/2 sm:-translate-x-1/2" style={{ color: "var(--text-secondary)" }}>
                  <TimeDisplay seconds={seg.start_time} /> - <TimeDisplay seconds={seg.end_time} />
                  {seg.loop_gap > 0 && <span className="ml-2">gap: {seg.loop_gap}s</span>}
                </span>
                </div>
              </div>

              <div className="segment-actions flex shrink-0 gap-0">
                {!isDefaultAllSegment && (
                  <button
                    data-no-reorder
                    disabled={locked}
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
                    disabled={locked}
                    onClick={(e) => { e.stopPropagation(); onDelete(seg.id); }}
                    className="icon-button"
                    style={{ color: "var(--text-secondary)" }}
                    aria-label="Delete segment"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
