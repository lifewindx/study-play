import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Class, Lesson } from "../types";
import { ensureAllSegmentsForLessons, getDb } from "../lib/db";
import { usePointerReorder } from "../hooks/usePointerReorder";
import { GripIcon, HomeIcon, PencilIcon, TrashIcon } from "../components/Icons";

export function LessonPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [cls, setCls] = useState<Class | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [showClassForm, setShowClassForm] = useState(false);
  const [classTitle, setClassTitle] = useState("");
  const [classDescription, setClassDescription] = useState("");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const loadData = useCallback(async () => {
    if (!classId) return;
    const db = await getDb();
    const [classRow] = await db.select<Class[]>(
      "SELECT * FROM classes WHERE id = $1",
      [Number(classId)]
    );
    setCls(classRow ?? null);
    const lessonRows = await db.select<Lesson[]>(
      "SELECT * FROM lessons WHERE class_id = $1 ORDER BY sort_order, id",
      [Number(classId)]
    );
    await ensureAllSegmentsForLessons(lessonRows.map((lesson) => lesson.id));
    setLessons(lessonRows);
  }, [classId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreateForm() {
    setEditingLessonId(null);
    setTitle("");
    setVideoUrl("");
    setShowForm(true);
  }

  function openEditForm(lesson: Lesson, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingLessonId(lesson.id);
    setTitle(lesson.title);
    setVideoUrl(lesson.video_url);
    setShowForm(true);
  }

  function closeForm() {
    setTitle("");
    setVideoUrl("");
    setEditingLessonId(null);
    setShowForm(false);
  }

  function openClassForm() {
    if (!cls) return;
    setClassTitle(cls.title);
    setClassDescription(cls.description ?? "");
    setShowClassForm(true);
  }

  function closeClassForm() {
    setClassTitle("");
    setClassDescription("");
    setShowClassForm(false);
  }

  async function handleSaveClass() {
    if (!cls || !classTitle.trim()) return;
    const db = await getDb();
    await db.execute(
      "UPDATE classes SET title = $1, description = $2, updated_at = datetime('now','localtime') WHERE id = $3",
      [classTitle.trim(), classDescription.trim(), cls.id]
    );
    closeClassForm();
    await loadData();
  }

  async function getYoutubeTitle(url: string): Promise<string> {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    try {
      const response = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const data = await response.json() as { title?: string };
        if (data.title) return data.title;
      }
    } catch {}
    return match ? `YouTube ${match[1]}` : "Untitled lesson";
  }

  async function handleSave() {
    if (!videoUrl.trim()) return;
    const resolvedTitle = title.trim() || await getYoutubeTitle(videoUrl.trim());
    const db = await getDb();
    if (editingLessonId !== null) {
      await db.execute(
        "UPDATE lessons SET title = $1, video_url = $2, updated_at = datetime('now','localtime') WHERE id = $3",
        [resolvedTitle, videoUrl.trim(), editingLessonId]
      );
    } else {
      const maxOrder = await db.select<[{ max: number }]>(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 as max FROM lessons WHERE class_id = $1",
        [Number(classId)]
      );
      const result = await db.execute(
        `INSERT INTO lessons (class_id, title, video_url, video_type, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          Number(classId),
          resolvedTitle,
          videoUrl.trim(),
          "youtube",
          maxOrder[0]?.max ?? 0,
        ]
      );
      const lessonId = (result as { lastInsertId?: number }).lastInsertId;
      if (lessonId !== undefined) {
        await db.execute(
          `INSERT INTO segments (lesson_id, label, start_time, end_time, loop_gap, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [lessonId, "All", 0, 0, 0, 0]
        );
      }
    }
    closeForm();
    await loadData();
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Delete this lesson and its segments?")) return;
    const db = await getDb();
    await db.execute("DELETE FROM lessons WHERE id = $1", [id]);
    await loadData();
  }

  async function handleReorder(draggedId: number, targetId: number, placement: "before" | "after") {
    if (draggedId === targetId) return;
    const fromIndex = lessons.findIndex((lesson) => lesson.id === draggedId);
    const toIndex = lessons.findIndex((lesson) => lesson.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...lessons];
    const [moved] = next.splice(fromIndex, 1);
    const targetIndex = next.findIndex((lesson) => lesson.id === targetId);
    next.splice(placement === "after" ? targetIndex + 1 : targetIndex, 0, moved);
    const ordered = next.map((lesson, index) => ({ ...lesson, sort_order: index }));
    setLessons(ordered);

    try {
      const db = await getDb();
      await Promise.all(
        ordered.map((lesson, index) =>
          db.execute("UPDATE lessons SET sort_order = $1 WHERE id = $2", [index, lesson.id])
        )
      );
    } catch {
      await loadData();
    }
  }

  const { draggingId: draggingLessonId, startReorderDrag } = usePointerReorder(handleReorder);

  if (!cls) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: "var(--text-secondary)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mb-6 flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
        <button onClick={() => navigate("/classes")} className="icon-button" aria-label="Library">
          <HomeIcon className="h-4 w-4" />
        </button>
        <span>/</span>
        <h1 className="truncate text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
          {cls.title}
        </h1>
        <button onClick={openClassForm} className="icon-button" aria-label="Edit class">
          <PencilIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-title">
          Lessons
        </h2>
        {!showForm && (
          <button
            onClick={openCreateForm}
            className="btn-primary"
          >
            New lesson
          </button>
        )}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={closeForm}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                {editingLessonId !== null ? "Edit lesson" : "New lesson"}
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                Add a YouTube link for focused loop practice.
              </p>
            </div>
            <input
              type="text"
              placeholder="Lesson title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field mb-3"
              maxLength={100}
              autoFocus
            />
            <input
              type="text"
              placeholder="YouTube URL (e.g., https://youtube.com/watch?v=...)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="input-field mb-4"
              maxLength={2000}
              pattern="https?://.+"
            />
            <div className="flex justify-end gap-2">
              <button onClick={closeForm} className="btn-ghost">
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary">
                {editingLessonId !== null ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClassForm && (
        <div className="modal-backdrop" onClick={closeClassForm}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Edit class
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                Update the class name and note.
              </p>
            </div>
            <input
              type="text"
              placeholder="Class title"
              value={classTitle}
              onChange={(e) => setClassTitle(e.target.value)}
              className="input-field mb-3"
              maxLength={100}
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={classDescription}
              onChange={(e) => setClassDescription(e.target.value)}
              className="input-field mb-4 resize-none"
              rows={3}
              maxLength={500}
            />
            <div className="flex justify-end gap-2">
              <button onClick={closeClassForm} className="btn-ghost">
                Cancel
              </button>
              <button onClick={handleSaveClass} className="btn-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {lessons.map((lesson) => (
          <div
            key={lesson.id}
            data-reorder-id={lesson.id}
            onClick={() => navigate(`/lesson/${lesson.id}`)}
            className={`card flex w-full cursor-pointer items-center gap-4 p-4 ${
              draggingLessonId === lesson.id ? "opacity-50" : ""
            }`}
          >
            <div
              className="drag-handle"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => startReorderDrag(lesson.id, e)}
            >
              <GripIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {lesson.title}
              </h3>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={(e) => openEditForm(lesson, e)}
                className="icon-button"
                aria-label="Edit lesson"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => handleDelete(lesson.id, e)}
                className="icon-button"
                aria-label="Delete lesson"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {lessons.length === 0 && (
          <p className="col-span-full rounded-3xl border py-12 text-center text-sm" style={{ color: "var(--text-muted)", borderColor: "var(--border-color)" }}>
            No lessons yet. Add your first lesson.
          </p>
        )}
      </div>
    </div>
  );
}
