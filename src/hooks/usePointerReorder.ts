import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

interface DragState {
  id: number;
  startX: number;
  startY: number;
  moved: boolean;
  offsetX: number;
  offsetY: number;
  preview: HTMLElement;
  marker: HTMLElement;
  targetId: number | null;
  placement: "before" | "after";
}

export function usePointerReorder(
  onReorder: (draggedId: number, targetId: number, placement: "before" | "after") => void,
  scope?: string
) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const cleanup = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    dragRef.current?.preview.remove();
    dragRef.current?.marker.remove();
    dragRef.current = null;
    setDraggingId(null);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const startReorderDrag = useCallback(
    (id: number, event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (target.closest("[data-no-reorder], input, textarea, select, a, [contenteditable='true']")) return;
      event.preventDefault();
      event.stopPropagation();

      cleanup();
      const row = event.currentTarget.closest<HTMLElement>("[data-reorder-id]");
      if (!row) return;

      const rect = row.getBoundingClientRect();
      const preview = row.cloneNode(true) as HTMLElement;
      preview.removeAttribute("data-reorder-id");
      preview.classList.add("reorder-preview");
      preview.style.width = `${rect.width}px`;
      preview.style.height = `${rect.height}px`;
      preview.style.minWidth = "0";
      preview.style.minHeight = "0";
      preview.style.maxWidth = `${rect.width}px`;
      preview.style.maxHeight = `${rect.height}px`;
      preview.style.overflow = "hidden";
      preview.style.left = `${event.clientX - (event.clientX - rect.left)}px`;
      preview.style.top = `${event.clientY - (event.clientY - rect.top)}px`;
      document.body.appendChild(preview);

      const marker = document.createElement("div");
      marker.className = "reorder-marker";
      document.body.appendChild(marker);

      dragRef.current = {
        id,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        preview,
        marker,
        targetId: null,
        placement: "before",
      };
      setDraggingId(id);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        if (
          Math.abs(moveEvent.clientX - drag.startX) > 3 ||
          Math.abs(moveEvent.clientY - drag.startY) > 3
        ) {
          drag.moved = true;
        }
        drag.preview.style.left = `${moveEvent.clientX - drag.offsetX}px`;
        drag.preview.style.top = `${moveEvent.clientY - drag.offsetY}px`;

        drag.preview.style.display = "none";
        drag.marker.style.display = "none";
        const element = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        drag.preview.style.display = "";
        const target = element?.closest<HTMLElement>("[data-reorder-id]");
        const targetId = Number(target?.dataset.reorderId);
        if (!target || !targetId || targetId === drag.id || (scope && target.dataset.reorderScope !== scope)) {
          drag.targetId = null;
          return;
        }

        const targetRect = target.getBoundingClientRect();
        drag.targetId = targetId;
        drag.placement = moveEvent.clientY < targetRect.top + targetRect.height / 2 ? "before" : "after";
        drag.marker.style.display = "";
        drag.marker.style.left = `${targetRect.left}px`;
        drag.marker.style.top = `${drag.placement === "before" ? targetRect.top : targetRect.bottom}px`;
        drag.marker.style.width = `${targetRect.width}px`;
      };

      const handlePointerUp = () => {
        const drag = dragRef.current;
        cleanup();
        if (!drag?.moved) return;

        if (drag.targetId && drag.targetId !== drag.id) {
          onReorderRef.current(drag.id, drag.targetId, drag.placement);
        }
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
      window.addEventListener("pointercancel", cleanup, { once: true });
      cleanupRef.current = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", cleanup);
      };
    },
    [cleanup, scope]
  );

  useEffect(() => cleanup, [cleanup]);

  return { draggingId, startReorderDrag };
}
