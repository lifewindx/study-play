import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Class, Lesson } from "../types";
import { ensureAllSegmentsForLessons, getDb } from "../lib/db";
import { usePointerReorder } from "../hooks/usePointerReorder";
import { getCardGridClassName, useCardViewMode } from "../hooks/useCardViewMode";
import { useLessonThumbnailVisibility } from "../hooks/useLessonThumbnailVisibility";
import { ChevronRightIcon, DifficultySortIcon, HeartIcon, HomeIcon, ImageIcon, PencilIcon, PlayIcon, PlusIcon, SearchIcon, XIcon } from "../components/Icons";
import { CardViewToggle } from "../components/CardViewToggle";
import { DifficultyStars } from "../components/DifficultyRating";
import { FavoriteButton } from "../components/FavoriteButton";
import { LessonFormModal } from "../components/LessonFormModal";
import { ModalBackdrop } from "../components/ModalBackdrop";

interface YoutubeMeta {
  title: string | null;
  channelName: string | null;
  thumbnailUrl: string;
}

function getYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] ?? null;
    }
  } catch {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] ?? null;
  }
  return null;
}

function getYoutubeThumbnailUrl(url: string): string | null {
  const videoId = getYoutubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
}

function getYoutubeThumbnailFallbackUrl(url: string): string | null {
  const videoId = getYoutubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/default.jpg` : null;
}

async function fetchYoutubeMeta(url: string): Promise<Omit<YoutubeMeta, "thumbnailUrl"> | null> {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
    if (!response.ok) return null;
    const data = await response.json() as { title?: string; author_name?: string };
    return {
      title: data.title?.trim() || null,
      channelName: data.author_name?.trim() || null,
    };
  } catch {
    return null;
  }
}

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
  const [sortByDifficulty, setSortByDifficulty] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { viewMode, changeViewMode } = useCardViewMode();
  const { showLessonThumbnails, toggleShowLessonThumbnails } = useLessonThumbnailVisibility();
  const [youtubeMetaByLessonId, setYoutubeMetaByLessonId] = useState<Record<number, YoutubeMeta>>({});
  const favoriteSaveSequenceRef = useRef(new Map<number, number>());

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
    setLessons(lessonRows);

    try {
      await ensureAllSegmentsForLessons(lessonRows.map((lesson) => lesson.id));
    } catch (error) {
      console.error("Failed to ensure default All segments", error);
    }
  }, [classId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreateForm() {
    setEditingLessonId(null);
    setShowForm(true);
  }

  function openEditForm(lesson: Lesson, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingLessonId(lesson.id);
    setShowForm(true);
  }

  function closeForm() {
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

  async function handleSave({ title, videoUrl }: { title: string; videoUrl: string }) {
    const videoId = getYoutubeVideoId(videoUrl);
    const isDuplicate = videoId !== null && lessons.some((lesson) => (
      lesson.id !== editingLessonId && getYoutubeVideoId(lesson.video_url) === videoId
    ));
    if (isDuplicate) return "이미 등록된 영상입니다.";

    const youtubeMeta = title ? null : await fetchYoutubeMeta(videoUrl);
    const resolvedTitle = title || youtubeMeta?.title || (videoId ? `YouTube ${videoId}` : "Untitled lesson");
    const db = await getDb();
    if (editingLessonId !== null) {
      await db.execute(
        "UPDATE lessons SET title = $1, video_url = $2, updated_at = datetime('now','localtime') WHERE id = $3",
        [resolvedTitle, videoUrl, editingLessonId]
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
          videoUrl,
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

  async function handleFavoriteChange(id: number, isFavorite: boolean) {
    const previousFavorite = Boolean(lessons.find((lesson) => lesson.id === id)?.is_favorite);
    const nextSequence = (favoriteSaveSequenceRef.current.get(id) ?? 0) + 1;
    favoriteSaveSequenceRef.current.set(id, nextSequence);
    setLessons((current) => current.map((lesson) => (
      lesson.id === id ? { ...lesson, is_favorite: isFavorite } : lesson
    )));

    try {
      const db = await getDb();
      await db.execute(
        "UPDATE lessons SET is_favorite = $1, updated_at = datetime('now','localtime') WHERE id = $2",
        [isFavorite, id]
      );
    } catch (error) {
      console.error("Failed to save lesson favorite", error);
      if (favoriteSaveSequenceRef.current.get(id) === nextSequence) {
        setLessons((current) => current.map((lesson) => (
          lesson.id === id ? { ...lesson, is_favorite: previousFavorite } : lesson
        )));
      }
    }
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

  const { draggingId: draggingLessonId, startReorderDrag } = usePointerReorder(handleReorder, "lessons");

  useEffect(() => {
    let cancelled = false;
    const youtubeLessons = lessons.filter((lesson) => lesson.video_type === "youtube" && getYoutubeThumbnailUrl(lesson.video_url));
    if (youtubeLessons.length === 0) {
      setYoutubeMetaByLessonId({});
      return;
    }

    async function loadYoutubeMeta() {
      const entries = await Promise.all(
        youtubeLessons.map(async (lesson) => {
          const metadata = await fetchYoutubeMeta(lesson.video_url);
          const thumbnailUrl = getYoutubeThumbnailUrl(lesson.video_url);
          if (!thumbnailUrl) return null;
          return [lesson.id, {
            title: metadata?.title ?? null,
            channelName: metadata?.channelName ?? null,
            thumbnailUrl,
          }] as const;
        })
      );
      if (cancelled) return;
      setYoutubeMetaByLessonId(Object.fromEntries(entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null)));
    }

    void loadYoutubeMeta();
    return () => {
      cancelled = true;
    };
  }, [lessons]);

  const listClassName = getCardGridClassName(viewMode);
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const favoriteFilteredLessons = showFavoritesOnly
    ? lessons.filter((lesson) => Boolean(lesson.is_favorite))
    : lessons;
  const filteredLessons = normalizedSearchQuery
    ? favoriteFilteredLessons.filter((lesson) => {
        const youtubeMeta = youtubeMetaByLessonId[lesson.id];
        return [lesson.title, lesson.notes, youtubeMeta?.title, youtubeMeta?.channelName]
          .some((value) => value?.toLocaleLowerCase().includes(normalizedSearchQuery));
      })
    : favoriteFilteredLessons;
  const displayedLessons = sortByDifficulty
    ? [...filteredLessons].sort((a, b) => {
        const aDifficulty = (a.difficulty ?? 0) > 0 ? a.difficulty : 6;
        const bDifficulty = (b.difficulty ?? 0) > 0 ? b.difficulty : 6;
        return aDifficulty - bDifficulty || a.sort_order - b.sort_order || a.id - b.id;
      })
    : filteredLessons;

  if (!cls) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: "var(--text-secondary)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mb-6 border-b pb-5" style={{ borderColor: "var(--border-color)" }}>
        <nav className="flex items-center gap-1.5 text-xs" aria-label="Breadcrumb">
          <button
            type="button"
            onClick={() => navigate("/classes")}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: "var(--text-secondary)", borderColor: "var(--border-color)", backgroundColor: "var(--surface-soft)" }}
          >
            <HomeIcon className="h-3.5 w-3.5" />
            <span>Library</span>
          </button>
          <ChevronRightIcon className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
          <span
            className="rounded-full px-2.5 py-1.5 font-medium"
            style={{ color: "var(--accent)", backgroundColor: "var(--accent-soft)" }}
          >
            Class
          </span>
        </nav>
        <div className="mt-3 flex min-w-0 items-center gap-3">
          <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
          <h1 className="min-w-0 truncate text-3xl font-semibold sm:text-4xl" style={{ color: "var(--text-primary)" }}>
            {cls.title}
          </h1>
          <button onClick={openClassForm} className="icon-button h-8 w-8 shrink-0" aria-label="Edit class" title="Edit class">
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_minmax(16rem,28rem)_1fr] md:items-center">
        <h2 className="section-title">
          Lessons
        </h2>
        <div className="relative w-full">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="input-field h-10 pl-9 pr-3"
            placeholder="레슨, 채널, YouTube 제목, 메모 검색"
            aria-label="레슨 검색"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowFavoritesOnly((current) => !current)}
            className={`icon-button h-10 w-10 border ${showFavoritesOnly ? "icon-button-active" : ""}`}
            style={{
              borderColor: "var(--border-color)",
              color: showFavoritesOnly ? "var(--favorite)" : undefined,
              backgroundColor: showFavoritesOnly ? "var(--favorite-soft)" : "var(--surface-soft)",
            }}
            aria-label="즐겨찾기만 보기"
            aria-pressed={showFavoritesOnly}
            title={showFavoritesOnly ? "모든 레슨 보기" : "즐겨찾기만 보기"}
          >
            <HeartIcon className="h-4 w-4" style={{ fill: showFavoritesOnly ? "currentColor" : "none" }} />
          </button>
          <button
            type="button"
            onClick={() => setSortByDifficulty((current) => !current)}
            className={`icon-button h-10 w-10 border ${sortByDifficulty ? "icon-button-active" : ""}`}
            style={{ borderColor: "var(--border-color)", backgroundColor: sortByDifficulty ? undefined : "var(--surface-soft)" }}
            aria-label="난이도별 보기"
            aria-pressed={sortByDifficulty}
            title={sortByDifficulty ? "기본 순서로 보기" : "난이도 낮은 순으로 보기"}
          >
            <DifficultySortIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleShowLessonThumbnails}
            className={`icon-button h-10 w-10 border ${showLessonThumbnails ? "icon-button-active" : ""}`}
            style={{ borderColor: "var(--border-color)", backgroundColor: showLessonThumbnails ? undefined : "var(--surface-soft)" }}
            aria-label="썸네일 표시"
            aria-pressed={showLessonThumbnails}
            title={showLessonThumbnails ? "썸네일 숨기기" : "썸네일 표시"}
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          <CardViewToggle value={viewMode} onChange={changeViewMode} />
          {!showForm && (
            <button
              onClick={openCreateForm}
              className="btn-primary h-10 w-10 p-0"
              aria-label="New lesson"
              title="New lesson"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <LessonFormModal
          key={editingLessonId ?? "new"}
          mode={editingLessonId === null ? "create" : "edit"}
          initialTitle={editingLessonId === null ? "" : lessons.find((lesson) => lesson.id === editingLessonId)?.title}
          initialVideoUrl={editingLessonId === null ? "" : lessons.find((lesson) => lesson.id === editingLessonId)?.video_url}
          onClose={closeForm}
          onSubmit={handleSave}
        />
      )}

      {showClassForm && (
        <ModalBackdrop onClose={closeClassForm}>
          <div className="modal-card">
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
        </ModalBackdrop>
      )}

      <div className={listClassName}>
        {displayedLessons.map((lesson) => {
          const youtubeMeta = youtubeMetaByLessonId[lesson.id];
          const thumbnailUrl = youtubeMeta?.thumbnailUrl ?? getYoutubeThumbnailUrl(lesson.video_url);
          const thumbnailFallbackUrl = getYoutubeThumbnailFallbackUrl(lesson.video_url);
          const noteSummary = lesson.notes?.replace(/\s+/g, " ").trim();
          const cardClassName = "card lesson-card group flex min-h-full w-full cursor-pointer flex-col px-3 py-2";
          const thumbnailClassName = "h-[72px] w-32";

          return (
            <div
              key={lesson.id}
              data-reorder-id={lesson.id}
              data-reorder-scope="lessons"
              onClick={() => navigate(`/lesson/${lesson.id}`)}
              onPointerDown={(e) => {
                if (!sortByDifficulty && !showFavoritesOnly && !normalizedSearchQuery) {
                  startReorderDrag(lesson.id, e);
                }
              }}
              className={`${cardClassName} ${
                draggingLessonId === lesson.id ? "opacity-50" : ""
              }`}
            >
              <div className="flex w-full flex-1 items-start gap-3">
                {showLessonThumbnails && (
                  <div
                    className={`${thumbnailClassName} shrink-0 overflow-hidden rounded-xl`}
                    style={{ backgroundColor: "var(--bg-tertiary)" }}
                  >
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          if (!thumbnailFallbackUrl || e.currentTarget.src === thumbnailFallbackUrl) return;
                          e.currentTarget.src = thumbnailFallbackUrl;
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                        Local video
                      </div>
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <h3 className="min-w-0 flex-1 truncate font-medium" style={{ color: "var(--text-primary)" }}>
                      {lesson.title}
                    </h3>
                    <DifficultyStars value={lesson.difficulty ?? 0} />
                  </div>
                  {lesson.video_type === "youtube" && (
                    <div className="mt-0.5 min-w-0">
                      <p className="truncate text-[10px] leading-snug" style={{ color: "var(--text-muted)" }}>
                        {youtubeMeta === undefined
                          ? "YouTube title loading..."
                          : youtubeMeta.title ?? "YouTube title unavailable"}
                      </p>
                      {youtubeMeta?.channelName && (
                        <p
                          className="mt-1 w-fit max-w-full truncate rounded px-1 py-px text-[7px] font-medium leading-none"
                          style={{ color: "var(--favorite)", backgroundColor: "var(--favorite-soft)" }}
                        >
                          {youtubeMeta.channelName}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1 text-[9px] leading-none" style={{ color: "var(--text-muted)" }}>
                        <PlayIcon className="h-2.5 w-2.5" />
                        <span>{lesson.play_count ?? 0}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-center justify-center">
                  <FavoriteButton
                    active={Boolean(lesson.is_favorite)}
                    onChange={(isFavorite) => void handleFavoriteChange(lesson.id, isFavorite)}
                    small
                  />
                  <div className="flex flex-col opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      data-no-reorder
                      onClick={(e) => openEditForm(lesson, e)}
                      className="icon-button h-6 w-6"
                      aria-label="Edit lesson"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      data-no-reorder
                      onClick={(e) => handleDelete(lesson.id, e)}
                      className="icon-button h-6 w-6"
                      aria-label="Delete lesson"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              {noteSummary && (
                <p
                  className="mt-2 w-full truncate border-t pt-2 text-xs font-medium"
                  style={{ color: "var(--warning)", borderColor: "var(--border-color)" }}
                  title={lesson.notes}
                >
                  {noteSummary}
                </p>
              )}
            </div>
          );
        })}
        {lessons.length === 0 && (
          <p className="col-span-full rounded-xl border py-12 text-center text-sm" style={{ color: "var(--text-muted)", borderColor: "var(--border-color)" }}>
            No lessons yet. Add your first lesson.
          </p>
        )}
        {lessons.length > 0 && displayedLessons.length === 0 && (
          <p className="col-span-full rounded-xl border py-12 text-center text-sm" style={{ color: "var(--text-muted)", borderColor: "var(--border-color)" }}>
            {showFavoritesOnly && !normalizedSearchQuery ? "즐겨찾기한 레슨이 없습니다." : "검색 결과가 없습니다."}
          </p>
        )}
      </div>
    </div>
  );
}
