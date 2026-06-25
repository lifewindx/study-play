import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Class, Lesson } from "../types";
import { getDb } from "../lib/db";
import { usePointerReorder } from "../hooks/usePointerReorder";
import { getCardGridClassName, useCardViewMode } from "../hooks/useCardViewMode";
import { CardViewToggle } from "../components/CardViewToggle";
import { ModalBackdrop } from "../components/ModalBackdrop";
import { PencilIcon, XIcon } from "../components/Icons";

export function ClassesPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [lessonCountByClassId, setLessonCountByClassId] = useState<Record<number, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { viewMode, changeViewMode } = useCardViewMode();

  const loadClasses = useCallback(async () => {
    const db = await getDb();
    const [rows, lessonRows] = await Promise.all([
      db.select<Class[]>("SELECT * FROM classes ORDER BY sort_order, id"),
      db.select<Array<Pick<Lesson, "class_id">>>("SELECT class_id FROM lessons"),
    ]);
    setClasses(rows);
    setLessonCountByClassId(lessonRows.reduce<Record<number, number>>((counts, lesson) => {
      counts[lesson.class_id] = (counts[lesson.class_id] ?? 0) + 1;
      return counts;
    }, {}));
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  function openCreateForm() {
    setEditingClassId(null);
    setTitle("");
    setDescription("");
    setShowForm(true);
  }

  function openEditForm(cls: Class, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingClassId(cls.id);
    setTitle(cls.title);
    setDescription(cls.description ?? "");
    setShowForm(true);
  }

function closeForm() {
    setTitle("");
    setDescription("");
    setEditingClassId(null);
    setShowForm(false);
  }

  async function handleSave() {
    if (!title.trim()) return;
    const db = await getDb();
    if (editingClassId !== null) {
      await db.execute(
        "UPDATE classes SET title = $1, description = $2, updated_at = datetime('now','localtime') WHERE id = $3",
        [title.trim(), description.trim(), editingClassId]
      );
    } else {
      const maxOrder = await db.select<[{ max: number }]>(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 as max FROM classes"
      );
      await db.execute(
        "INSERT INTO classes (title, description, sort_order) VALUES ($1, $2, $3)",
        [title.trim(), description.trim(), maxOrder[0]?.max ?? 0]
      );
    }
    closeForm();
    await loadClasses();
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Delete this class and its lessons?")) return;
    const db = await getDb();
    await db.execute("DELETE FROM classes WHERE id = $1", [id]);
    await loadClasses();
  }

  async function handleReorder(draggedId: number, targetId: number, placement: "before" | "after") {
    if (draggedId === targetId) return;
    const fromIndex = classes.findIndex((cls) => cls.id === draggedId);
    const toIndex = classes.findIndex((cls) => cls.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...classes];
    const [moved] = next.splice(fromIndex, 1);
    const targetIndex = next.findIndex((cls) => cls.id === targetId);
    next.splice(placement === "after" ? targetIndex + 1 : targetIndex, 0, moved);
    const ordered = next.map((cls, index) => ({ ...cls, sort_order: index }));
    setClasses(ordered);

    try {
      const db = await getDb();
      await Promise.all(
        ordered.map((cls, index) =>
          db.execute("UPDATE classes SET sort_order = $1 WHERE id = $2", [index, cls.id])
        )
      );
    } catch {
      await loadClasses();
    }
  }

  const { draggingId: draggingClassId, startReorderDrag } = usePointerReorder(handleReorder, "classes");

  return (
    <div className="page-shell">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="section-title mb-2">Library</p>
          <h1 className="text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Practice classes
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <CardViewToggle value={viewMode} onChange={changeViewMode} />
          {!showForm && (
            <button
              onClick={openCreateForm}
              className="btn-primary"
            >
              New class
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <ModalBackdrop onClose={closeForm}>
          <div className="modal-card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                {editingClassId !== null ? "Edit class" : "New class"}
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                Name the practice group and add a short note if needed.
              </p>
            </div>
            <input
              type="text"
              placeholder="Class title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field mb-3"
              maxLength={100}
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field mb-4 resize-none"
              rows={3}
              maxLength={500}
            />
            <div className="flex justify-end gap-2">
              <button onClick={closeForm} className="btn-ghost">
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary">
                {editingClassId !== null ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      <div className={getCardGridClassName(viewMode)}>
        {classes.map((cls) => (
          <div
            key={cls.id}
            data-reorder-id={cls.id}
            data-reorder-scope="classes"
            onClick={() => navigate(`/classes/${cls.id}`)}
            onPointerDown={(e) => startReorderDrag(cls.id, e)}
            className={`card group flex cursor-pointer items-center gap-3 rounded-xl border-l-[3px] py-3 pl-6 pr-3 ${
              draggingClassId === cls.id ? "opacity-50" : ""
            }`}
            style={{ borderLeftColor: "var(--accent)" }}
          >
            <div className="flex-1 min-w-0">
              <h3 className="truncate text-lg font-semibold" style={{ color: "var(--class-title)" }}>
                {cls.title}
              </h3>
              {cls.description && (
                <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {cls.description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span
                className="mr-1 rounded-lg px-2 py-1 text-xs font-medium"
                style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-tertiary)" }}
              >
                {lessonCountByClassId[cls.id] ?? 0}
              </span>
              <div className="flex flex-col items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  data-no-reorder
                  onClick={(e) => openEditForm(cls, e)}
                  className="icon-button h-8 w-8"
                  aria-label="Edit class"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  data-no-reorder
                  onClick={(e) => handleDelete(cls.id, e)}
                  className="icon-button h-8 w-8"
                  aria-label="Delete class"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <p className="col-span-full rounded-xl border py-12 text-center text-sm" style={{ color: "var(--text-muted)", borderColor: "var(--border-color)" }}>
            No classes yet. Create your first class to get started.
          </p>
        )}
      </div>
    </div>
  );
}
