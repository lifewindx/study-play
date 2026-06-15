import { useCallback, useEffect, useState } from "react";
import type { RoutineItem } from "../types";
import { ensureRoutineItems, getDb } from "../lib/db";
import { usePointerReorder } from "../hooks/usePointerReorder";
import { CheckIcon, GripIcon, PlusIcon, TrashIcon, XIcon } from "./Icons";

const REORDER_SCOPE = "routine-items";

function getNextResetDelay() {
  const now = new Date();
  const nextReset = new Date(now);
  nextReset.setHours(6, 0, 0, 0);
  if (now >= nextReset) nextReset.setDate(nextReset.getDate() + 1);
  return nextReset.getTime() - now.getTime();
}

export function RoutinePanel() {
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const rows = await ensureRoutineItems();
      setItems(rows);
      setError(null);
    } catch (err) {
      console.error("Failed to load routine items", err);
      setError("Routine storage is not ready.");
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadItems();
    }, getNextResetDelay());

    return () => window.clearTimeout(timeoutId);
  }, [loadItems, items]);

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const db = await getDb();
      const maxOrder = await db.select<[{ max: number }]>(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 as max FROM routine_items"
      );
      await db.execute("INSERT INTO routine_items (title, sort_order) VALUES ($1, $2)", [
        title,
        maxOrder[0]?.max ?? 0,
      ]);
      setNewTitle("");
      setIsAdding(false);
      setError(null);
      await loadItems();
    } catch (err) {
      console.error("Failed to add routine item", err);
      setError("Could not add routine.");
    }
  }

  async function handleToggle(item: RoutineItem) {
    const nextCompletedAt = item.completed_at ? null : new Date().toISOString();
    const next = items.map((current) =>
      current.id === item.id ? { ...current, completed_at: nextCompletedAt } : current
    );
    setItems(next);

    try {
      const db = await getDb();
      await db.execute("UPDATE routine_items SET completed_at = $1 WHERE id = $2", [
        nextCompletedAt,
        item.id,
      ]);
    } catch {
      await loadItems();
    }
  }

  async function handleDelete(id: number) {
    const next = items.filter((item) => item.id !== id);
    setItems(next);

    try {
      const db = await getDb();
      await db.execute("DELETE FROM routine_items WHERE id = $1", [id]);
      await Promise.all(
        next.map((item, index) =>
          db.execute("UPDATE routine_items SET sort_order = $1 WHERE id = $2", [index, item.id])
        )
      );
      await loadItems();
    } catch {
      await loadItems();
    }
  }

  async function handleReorder(draggedId: number, targetId: number, placement: "before" | "after") {
    if (draggedId === targetId) return;
    const fromIndex = items.findIndex((item) => item.id === draggedId);
    const toIndex = items.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    const targetIndex = next.findIndex((item) => item.id === targetId);
    next.splice(placement === "after" ? targetIndex + 1 : targetIndex, 0, moved);
    const ordered = next.map((item, index) => ({ ...item, sort_order: index }));
    setItems(ordered);

    try {
      const db = await getDb();
      await Promise.all(
        ordered.map((item, index) =>
          db.execute("UPDATE routine_items SET sort_order = $1 WHERE id = $2", [index, item.id])
        )
      );
    } catch {
      await loadItems();
    }
  }

  const { draggingId, startReorderDrag } = usePointerReorder(handleReorder, REORDER_SCOPE);
  const completedCount = items.filter((item) => item.completed_at).length;

  return (
    <aside className="routine-panel">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Routine
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {completedCount}/{items.length} done
          </div>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => setIsAdding((value) => !value)}
          aria-label={isAdding ? "Close routine form" : "Add routine"}
        >
          {isAdding ? <XIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
        </button>
      </div>

      {isAdding && (
        <form
          className="mb-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleAdd();
          }}
        >
          <input
            type="text"
            className="input-field min-w-0 flex-1"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="New routine"
            maxLength={80}
            autoFocus
          />
          <button type="submit" className="btn-primary px-3">
            Add
          </button>
        </form>
      )}

      {error && (
        <div className="mb-3 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: "var(--border-color)", color: "var(--warning)" }}>
          {error}
        </div>
      )}

      <div className="space-y-2">
        {items.map((item) => {
          const isDone = Boolean(item.completed_at);
          return (
            <div
              key={item.id}
              data-reorder-id={item.id}
              data-reorder-scope={REORDER_SCOPE}
              className={`routine-item ${draggingId === item.id ? "opacity-50" : ""}`}
            >
              <div
                className="drag-handle h-8 w-6"
                onPointerDown={(event) => startReorderDrag(item.id, event)}
              >
                <GripIcon className="h-4 w-4" />
              </div>
              <button
                type="button"
                className={`routine-check ${isDone ? "routine-check-done" : ""}`}
                onClick={() => handleToggle(item)}
                aria-label={isDone ? "Mark routine incomplete" : "Mark routine complete"}
              >
                {isDone && <CheckIcon className="h-3.5 w-3.5" />}
              </button>
              <span className={`routine-title ${isDone ? "routine-title-done" : ""}`}>
                {item.title}
              </span>
              <button
                type="button"
                className="icon-button h-8 w-8 shrink-0"
                onClick={() => handleDelete(item.id)}
                aria-label="Delete routine"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
