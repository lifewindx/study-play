import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Class, Lesson, Segment } from "../types";
import { getDb } from "../lib/db";
import { VideoPlayer, type VideoPlayerHandle } from "../components/VideoPlayer";
import { SegmentList } from "../components/SegmentList";
import { SegmentEditor } from "../components/SegmentEditor";
import {
  FlipIcon,
  FullscreenIcon,
  GaugeIcon,
  HomeIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  RotateIcon,
  TrashIcon,
  UndoIcon,
} from "../components/Icons";

export function PlayerPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<VideoPlayerHandle>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [classTitle, setClassTitle] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);
  const [showNewSegment, setShowNewSegment] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [playCommand, setPlayCommand] = useState(0);
  const [pauseCommand, setPauseCommand] = useState(0);

  const loadData = useCallback(async () => {
    if (!lessonId) return;
    const db = await getDb();
    const [lessonRow] = await db.select<Lesson[]>(
      "SELECT * FROM lessons WHERE id = $1",
      [Number(lessonId)]
    );
    setLesson(lessonRow ?? null);
    if (lessonRow) {
      const [classRow] = await db.select<Class[]>(
        "SELECT * FROM classes WHERE id = $1",
        [lessonRow.class_id]
      );
      setClassTitle(classRow?.title ?? "");
    }
    const segmentRows = await db.select<Segment[]>(
      "SELECT * FROM segments WHERE lesson_id = $1 ORDER BY sort_order, id",
      [Number(lessonId)]
    );
    setSegments(segmentRows);
  }, [lessonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const recordSession = useCallback(async () => {
    if (!lessonId) return;
    const db = await getDb();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    await db.execute(
      `INSERT INTO study_sessions (lesson_id, segment_id, started_at, ended_at, duration_seconds)
       VALUES ($1, $2, $3, $4, $5)`,
      [Number(lessonId), activeSegment?.id ?? null, now, now, 0]
    );
  }, [lessonId, activeSegment]);

  function handlePlayPause() {
    if (segments.length === 0) return;
    if (!isPlaying) {
      const segment = activeSegment ?? segments[0];
      if (!activeSegment) {
        setActiveSegment(segment);
      }
      videoRef.current?.playSegment(segment.start_time, segment.end_time, segment.loop_gap);
      recordSession();
      setPlayCommand((value) => value + 1);
    } else {
      videoRef.current?.pause();
      setPauseCommand((value) => value + 1);
    }
    setIsPlaying(!isPlaying);
  }

  function handleSelectSegment(seg: Segment) {
    setActiveSegment(seg);
    setIsPlaying(true);
    videoRef.current?.playSegment(seg.start_time, seg.end_time, seg.loop_gap);
    setPlayCommand((value) => value + 1);
    recordSession();
  }

  async function handleSaveSegment(data: {
    label: string;
    start_time: number;
    end_time: number;
    loop_gap: number;
  }) {
    const db = await getDb();
    if (editingSegmentId !== null) {
      await db.execute(
        `UPDATE segments SET label = $1, start_time = $2, end_time = $3, loop_gap = $4,
         updated_at = datetime('now','localtime') WHERE id = $5`,
        [data.label, data.start_time, data.end_time, data.loop_gap, editingSegmentId]
      );
      setEditingSegmentId(null);
    } else {
      const maxOrder = await db.select<[{ max: number }]>(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 as max FROM segments WHERE lesson_id = $1",
        [Number(lessonId)]
      );
      await db.execute(
        `INSERT INTO segments (lesson_id, label, start_time, end_time, loop_gap, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [Number(lessonId), data.label, data.start_time, data.end_time, data.loop_gap, maxOrder[0]?.max ?? 0]
      );
      setShowNewSegment(false);
    }
    await loadData();
  }

  async function handleDeleteSegment(id: number) {
    if (!window.confirm("Delete this segment?")) return;
    const db = await getDb();
    await db.execute("DELETE FROM segments WHERE id = $1", [id]);
    if (activeSegment?.id === id) {
      setActiveSegment(null);
    }
    await loadData();
  }

  async function handleReorderSegment(draggedId: number, targetId: number, placement: "before" | "after") {
    if (draggedId === targetId) return;
    const fromIndex = segments.findIndex((segment) => segment.id === draggedId);
    const toIndex = segments.findIndex((segment) => segment.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...segments];
    const [moved] = next.splice(fromIndex, 1);
    const targetIndex = next.findIndex((segment) => segment.id === targetId);
    next.splice(placement === "after" ? targetIndex + 1 : targetIndex, 0, moved);
    const ordered = next.map((segment, index) => ({ ...segment, sort_order: index }));
    setSegments(ordered);
    if (activeSegment) {
      setActiveSegment(ordered.find((segment) => segment.id === activeSegment.id) ?? null);
    }

    try {
      const db = await getDb();
      await Promise.all(
        ordered.map((segment, index) =>
          db.execute("UPDATE segments SET sort_order = $1 WHERE id = $2", [index, segment.id])
        )
      );
    } catch {
      await loadData();
    }
  }

  function handleSpeedChange(delta: number) {
    setSpeed((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.max(0.25, Math.min(4, next));
    });
  }

  function handleRotate() {
    setRotation((prev) => (prev + 90) % 360);
  }

  function toggleFullscreen() {
    setIsFullscreen((prev) => !prev);
  }

  function handleTimeUpdate(time: number) {
    setCurrentTime(time);
  }

  function openLessonEditor() {
    if (!lesson) return;
    setLessonTitle(lesson.title);
    setLessonVideoUrl(lesson.video_url);
    setShowLessonForm(true);
  }

  function closeLessonEditor() {
    setShowLessonForm(false);
    setLessonTitle("");
    setLessonVideoUrl("");
  }

  async function handleSaveLesson() {
    if (!lesson || !lessonTitle.trim() || !lessonVideoUrl.trim()) return;
    if (
      lessonVideoUrl.trim() !== lesson.video_url &&
      segments.length > 0 &&
      !window.confirm("Changing the YouTube link may make existing segments point to the wrong moments. Save anyway?")
    ) {
      return;
    }
    const db = await getDb();
    await db.execute(
      "UPDATE lessons SET title = $1, video_url = $2, updated_at = datetime('now','localtime') WHERE id = $3",
      [lessonTitle.trim(), lessonVideoUrl.trim(), lesson.id]
    );
    closeLessonEditor();
    await loadData();
  }

  async function handleDeleteLesson() {
    if (!lesson) return;
    if (!window.confirm("Delete this lesson and all of its segments?")) return;
    const db = await getDb();
    await db.execute("DELETE FROM lessons WHERE id = $1", [lesson.id]);
    navigate(`/classes/${lesson.class_id}`);
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: "var(--text-secondary)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
        <button onClick={() => navigate("/classes")} className="icon-button" aria-label="Library">
          <HomeIcon className="h-4 w-4" />
        </button>
        <span>/</span>
        <button
          onClick={() => navigate(`/classes/${lesson.class_id}`)}
          className="rounded-xl px-2 py-1 transition-colors hover:bg-[var(--bg-tertiary)]"
        >
          {classTitle || "Class"}
        </button>
        <span>/</span>
        <h1 className="truncate text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          {lesson.title}
        </h1>
      </div>

      <div className={isFullscreen ? "fixed inset-0 z-50 flex flex-col bg-black p-4" : "player-panel"}>
        <div className={isFullscreen ? "flex-1 overflow-hidden rounded-3xl" : "overflow-hidden rounded-3xl border"} style={{ borderColor: "var(--border-color)" }}>
          <div className={isFullscreen ? "h-full" : "aspect-video"}>
            <VideoPlayer
              ref={videoRef}
              videoType={lesson.video_type}
              videoUrl={lesson.video_url}
              startTime={activeSegment?.start_time ?? 0}
              endTime={activeSegment?.end_time ?? 0}
              loopGap={activeSegment?.loop_gap ?? 0}
              isPlaying={isPlaying}
              speed={speed}
              rotation={rotation}
              flipH={flipH}
              flipV={flipV}
              onTimeUpdate={handleTimeUpdate}
              segmentKey={activeSegment?.id}
              playCommand={playCommand}
              pauseCommand={pauseCommand}
            />
          </div>
          <div className="h-1.5" style={{ backgroundColor: "var(--bg-tertiary)" }}>
            <div
              className="h-full"
              style={{
                width: activeSegment
                  ? `${Math.max(
                      0,
                      Math.min(
                        100,
                        ((currentTime - activeSegment.start_time) /
                          Math.max(activeSegment.end_time - activeSegment.start_time, 0.1)) *
                          100
                      )
                    )}%`
                  : "0%",
                backgroundColor: "var(--accent)",
              }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="w-full text-left">
            {activeSegment ? (
              <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                {activeSegment.label || `Segment ${segments.indexOf(activeSegment) + 1}`}
                <span className="ml-3 text-sm font-mono font-normal" style={{ color: "var(--text-muted)" }}>
                  {formatTimeShort(currentTime)} / {formatTimeShort(activeSegment.end_time)}
                </span>
              </div>
            ) : (
              <div className="text-base" style={{ color: "var(--text-muted)" }}>
                Add and select a segment to play
              </div>
            )}
          </div>

          <button
            onClick={handlePlayPause}
            className="btn-primary min-w-24 gap-2 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={segments.length === 0}
          >
            {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
            {isPlaying ? "Pause" : "Play"}
          </button>

          <div className="control-group">
            <span className="inline-flex items-center gap-2 px-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <GaugeIcon className="h-4 w-4" />
            </span>
            <button onClick={() => handleSpeedChange(-0.1)} className="control-chip">
              Slower
            </button>
            <span className="min-w-[3rem] text-center text-sm font-mono" style={{ color: "var(--text-primary)" }}>
              {speed}x
            </span>
            <button onClick={() => handleSpeedChange(0.1)} className="control-chip">
              Faster
            </button>
            <button onClick={() => setSpeed(1)} className="icon-button" aria-label="Reset speed">
              <UndoIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="control-group">
            <button onClick={handleRotate} className="control-chip">
              <RotateIcon className="h-4 w-4" />
              Rotate
            </button>

            <button
              onClick={() => setFlipH(!flipH)}
              className="control-chip"
              style={{
                backgroundColor: flipH ? "var(--accent)" : "var(--bg-tertiary)",
                color: flipH ? "var(--accent-contrast)" : "var(--text-primary)",
              }}
            >
              <FlipIcon className="h-4 w-4" />
              {flipH ? "Unflip H" : "Flip H"}
            </button>

            <button
              onClick={() => setFlipV(!flipV)}
              className="control-chip"
              style={{
                backgroundColor: flipV ? "var(--accent)" : "var(--bg-tertiary)",
                color: flipV ? "var(--accent-contrast)" : "var(--text-primary)",
              }}
            >
              <FlipIcon className="h-4 w-4 rotate-90" />
              {flipV ? "Unflip V" : "Flip V"}
            </button>

            <button onClick={toggleFullscreen} className="control-chip">
              <FullscreenIcon className="h-4 w-4" />
              {isFullscreen ? "Exit" : "Fullscreen"}
            </button>
          </div>

        </div>
      </div>


      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">
            Practice Segments
          </h2>
          <button
            onClick={() => {
              setShowNewSegment(true);
              setEditingSegmentId(null);
            }}
            className="btn-primary"
          >
            Add segment
          </button>
        </div>

        {showNewSegment && (
          <div className="mb-3">
            <SegmentEditor
              onSave={handleSaveSegment}
              onCancel={() => setShowNewSegment(false)}
            />
          </div>
        )}

        <SegmentList
          segments={segments}
          activeSegmentId={activeSegment?.id ?? null}
          editingSegmentId={editingSegmentId}
          onSelect={handleSelectSegment}
          onEdit={(seg) => {
            setEditingSegmentId(seg.id);
            setShowNewSegment(false);
          }}
          onSaveEdit={handleSaveSegment}
          onCancelEdit={() => setEditingSegmentId(null)}
          onDelete={handleDeleteSegment}
          onReorder={handleReorderSegment}
        />
      </div>

      <div className="flex justify-end gap-2 border-t pt-5" style={{ borderColor: "var(--border-color)" }}>
        <button onClick={openLessonEditor} className="btn-ghost gap-2">
          <PencilIcon className="h-4 w-4" />
          Edit lesson
        </button>
        <button onClick={handleDeleteLesson} className="btn-ghost gap-2">
          <TrashIcon className="h-4 w-4" />
          Delete lesson
        </button>
      </div>

      {showLessonForm && (
        <div className="modal-backdrop" onClick={closeLessonEditor}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Edit lesson
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                Updating the link can shift existing segment timing.
              </p>
            </div>
            <input
              type="text"
              placeholder="Lesson title"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              className="input-field mb-3"
              autoFocus
            />
            <input
              type="text"
              placeholder="YouTube URL"
              value={lessonVideoUrl}
              onChange={(e) => setLessonVideoUrl(e.target.value)}
              className="input-field mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={closeLessonEditor} className="btn-ghost">
                Cancel
              </button>
              <button onClick={handleSaveLesson} className="btn-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}
