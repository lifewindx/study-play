import { createClient } from "@supabase/supabase-js";
import type { RoutineCompletion, RoutineItem, Segment } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

interface StudyDb {
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
  execute(query: string, bindValues?: unknown[]): Promise<unknown>;
}

let db: StudyDb | null = null;

export async function getDb(): Promise<StudyDb> {
  if (db) return db;
  db = new SupabaseDB();
  return db;
}

type SegmentSeedRow = Pick<Segment, "lesson_id" | "label" | "start_time" | "end_time" | "sort_order">;

const DEFAULT_ROUTINE_TITLES = [
  "스케일",
  "펜타",
  "CCM",
  "코드톤",
  "Backing",
  "트라이어드",
  "드롭2",
  "드롭3",
  "마이너스케일들",
  "모드",
  "재마클",
];

const LEGACY_ROUTINE_TITLES = [
  "손 풀기와 튜닝",
  "느린 템포로 핵심 구간 반복",
  "원곡 속도로 이어서 연주",
  "오늘 어려웠던 부분 메모",
];

function isAllSegment(segment: Pick<Segment, "label" | "start_time">): boolean {
  return segment.label === "All" && segment.start_time === 0;
}

export async function ensureAllSegmentsForLessons(lessonIds: number[]): Promise<number> {
  const uniqueLessonIds = [...new Set(lessonIds)].filter((id) => Number.isFinite(id));
  if (uniqueLessonIds.length === 0) return 0;

  const { data: existingSegments, error: selectError } = await supabase
    .from("segments")
    .select("lesson_id,label,start_time,end_time,sort_order")
    .in("lesson_id", uniqueLessonIds);
  if (selectError) throw selectError;

  const segmentsByLessonId = new Map<number, SegmentSeedRow[]>();
  for (const segment of (existingSegments ?? []) as SegmentSeedRow[]) {
    const list = segmentsByLessonId.get(segment.lesson_id) ?? [];
    list.push(segment);
    segmentsByLessonId.set(segment.lesson_id, list);
  }

  const lessonIdsMissingAll = uniqueLessonIds
    .filter((lessonId) => !(segmentsByLessonId.get(lessonId) ?? []).some(isAllSegment));
  if (lessonIdsMissingAll.length === 0) return 0;

  const userId = await getUserId();
  const inserts = lessonIdsMissingAll.map((lessonId) => {
    const sortOrders = (segmentsByLessonId.get(lessonId) ?? []).map((segment) => segment.sort_order);
    return {
      user_id: userId,
      lesson_id: lessonId,
      label: "All",
      start_time: 0,
      end_time: 0,
      loop_gap: 0,
      sort_order: sortOrders.length > 0 ? Math.min(...sortOrders) - 1 : 0,
    };
  });

  const results = await Promise.all(inserts.map(async (insert) => {
    const { error } = await supabase.from("segments").insert(insert);
    if (!error) return true;

    // Another page load may have inserted the same system segment concurrently.
    if (error.code === "23505") return false;
    throw error;
  }));

  return results.filter(Boolean).length;
}

class SupabaseDB implements StudyDb {
  async select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
    const normalized = query.replace(/\s+/g, " ").trim();

    if (normalized.startsWith("SELECT * FROM classes ORDER BY")) {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("sort_order")
        .order("id");
      if (error) throw error;
      return (data ?? []) as T;
    }

    if (normalized.startsWith("SELECT COALESCE(MAX(sort_order), -1) + 1 as max FROM classes")) {
      const { data, error } = await supabase
        .from("classes")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);
      if (error) throw error;
      const max = data?.[0]?.sort_order ?? -1;
      return [{ max: max + 1 }] as T;
    }

    if (normalized.startsWith("SELECT * FROM classes WHERE id =")) {
      const id = Number(bindValues[0]);
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ? [data] : []) as T;
    }

    if (normalized.startsWith("SELECT * FROM lessons WHERE class_id =")) {
      const classId = Number(bindValues[0]);
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("class_id", classId)
        .order("sort_order")
        .order("id");
      if (error) throw error;
      return (data ?? []) as T;
    }

    if (normalized.startsWith("SELECT COALESCE(MAX(sort_order), -1) + 1 as max FROM lessons")) {
      const classId = Number(bindValues[0]);
      const { data, error } = await supabase
        .from("lessons")
        .select("sort_order")
        .eq("class_id", classId)
        .order("sort_order", { ascending: false })
        .limit(1);
      if (error) throw error;
      const max = data?.[0]?.sort_order ?? -1;
      return [{ max: max + 1 }] as T;
    }

    if (normalized.startsWith("SELECT * FROM lessons WHERE id =")) {
      const id = Number(bindValues[0]);
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ? [data] : []) as T;
    }

    if (normalized.startsWith("SELECT * FROM segments WHERE lesson_id =")) {
      const lessonId = Number(bindValues[0]);
      const { data, error } = await supabase
        .from("segments")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("sort_order")
        .order("id");
      if (error) throw error;
      return (data ?? []) as T;
    }

    if (normalized.startsWith("SELECT COALESCE(MAX(sort_order), -1) + 1 as max FROM segments")) {
      const lessonId = Number(bindValues[0]);
      const { data, error } = await supabase
        .from("segments")
        .select("sort_order")
        .eq("lesson_id", lessonId)
        .order("sort_order", { ascending: false })
        .limit(1);
      if (error) throw error;
      const max = data?.[0]?.sort_order ?? -1;
      return [{ max: max + 1 }] as T;
    }

    if (normalized.includes("FROM study_sessions ss JOIN lessons l")) {
      const startDate = String(bindValues[0]);
      const endDate = bindValues.length > 1 ? String(bindValues[1]) : null;
      const classId = bindValues.length > 2 && bindValues[2] !== null
        ? Number(bindValues[2])
        : null;
      let query = supabase
        .from("study_sessions")
        .select("*, lessons!inner(title, class_id, classes!inner(title))")
        .order("started_at", { ascending: false });

      if (endDate) {
        query = query.gte("started_at", startDate).lte("started_at", endDate + "T23:59:59");
      } else {
        query = query.gte("started_at", startDate).lte("started_at", startDate + "T23:59:59");
      }

      if (classId !== null) {
        query = query.eq("lessons.class_id", classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? [])
        .filter((s) => s.lessons && s.lessons.classes)
        .map((s) => ({
          ...s,
          lesson_title: (s.lessons as { title: string; class_id: number }).title ?? "",
          class_id: (s.lessons as { title: string; class_id: number }).class_id,
          class_title: ((s.lessons as { classes: { title: string } }).classes as { title: string }).title ?? "",
        }));
      return rows as T;
    }

    if (normalized.startsWith("SELECT * FROM routine_items ORDER BY")) {
      const { data, error } = await supabase
        .from("routine_items")
        .select("*")
        .order("sort_order")
        .order("id");
      if (error) throw error;
      return (data ?? []) as T;
    }

    if (normalized.startsWith("SELECT COALESCE(MAX(sort_order), -1) + 1 as max FROM routine_items")) {
      const { data, error } = await supabase
        .from("routine_items")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);
      if (error) throw error;
      const max = data?.[0]?.sort_order ?? -1;
      return [{ max: max + 1 }] as T;
    }

    return [] as T;
  }

  async execute(query: string, bindValues: unknown[] = []): Promise<unknown> {
    const normalized = query.replace(/\s+/g, " ").trim();
    const userId = await getUserId();

    if (normalized.startsWith("CREATE TABLE")) return { rowsAffected: 0 };

    if (normalized.startsWith("INSERT INTO classes")) {
      const { error } = await supabase.from("classes").insert({
        user_id: userId,
        title: String(bindValues[0]),
        description: String(bindValues[1] ?? ""),
        sort_order: Number(bindValues[2] ?? 0),
      });
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("INSERT INTO lessons")) {
      const { data, error } = await supabase
        .from("lessons")
        .insert({
          user_id: userId,
          class_id: Number(bindValues[0]),
          title: String(bindValues[1]),
          video_url: String(bindValues[2]),
          video_type: bindValues[3] === "local" ? "local" : "youtube",
          sort_order: Number(bindValues[4] ?? 0),
        })
        .select("id")
        .single();
      if (error) throw error;
      return { rowsAffected: 1, lastInsertId: data.id };
    }

    if (normalized.startsWith("INSERT INTO segments")) {
      const { error } = await supabase.from("segments").insert({
        user_id: userId,
        lesson_id: Number(bindValues[0]),
        label: String(bindValues[1] ?? ""),
        start_time: Number(bindValues[2] ?? 0),
        end_time: Number(bindValues[3] ?? 0),
        loop_gap: Number(bindValues[4] ?? 0),
        sort_order: Number(bindValues[5] ?? 0),
      });
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("INSERT INTO study_sessions")) {
      const segId = bindValues[1] ?? null;
      const { error } = await supabase.from("study_sessions").insert({
        user_id: userId,
        lesson_id: Number(bindValues[0]),
        segment_id: segId !== null ? Number(segId) : null,
        started_at: String(bindValues[2]),
        ended_at: String(bindValues[3]),
        duration_seconds: Number(bindValues[4] ?? 0),
      });
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("INSERT INTO routine_items")) {
      const { error } = await supabase.from("routine_items").insert({
        user_id: userId,
        title: String(bindValues[0] ?? ""),
        sort_order: Number(bindValues[1] ?? 0),
      });
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("UPDATE classes SET sort_order")) {
      const { error } = await supabase
        .from("classes")
        .update({ sort_order: Number(bindValues[0]) })
        .eq("id", Number(bindValues[1]));
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("UPDATE classes SET title")) {
      const { error } = await supabase
        .from("classes")
        .update({
          title: String(bindValues[0] ?? ""),
          description: String(bindValues[1] ?? ""),
          updated_at: new Date().toISOString(),
        })
        .eq("id", Number(bindValues[2]));
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("UPDATE lessons SET sort_order")) {
      const { error } = await supabase
        .from("lessons")
        .update({ sort_order: Number(bindValues[0]) })
        .eq("id", Number(bindValues[1]));
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("UPDATE lessons SET title")) {
      const { error } = await supabase
        .from("lessons")
        .update({
          title: String(bindValues[0] ?? ""),
          video_url: String(bindValues[1] ?? ""),
          updated_at: new Date().toISOString(),
        })
        .eq("id", Number(bindValues[2]));
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("UPDATE segments SET sort_order")) {
      const { error } = await supabase
        .from("segments")
        .update({ sort_order: Number(bindValues[0]) })
        .eq("id", Number(bindValues[1]));
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("UPDATE segments SET label")) {
      const { error } = await supabase
        .from("segments")
        .update({
          label: String(bindValues[0] ?? ""),
          start_time: Number(bindValues[1] ?? 0),
          end_time: Number(bindValues[2] ?? 0),
          loop_gap: Number(bindValues[3] ?? 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", Number(bindValues[4]));
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("UPDATE routine_items SET sort_order")) {
      const { error } = await supabase
        .from("routine_items")
        .update({ sort_order: Number(bindValues[0]) })
        .eq("id", Number(bindValues[1]));
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("UPDATE routine_items SET completed_at")) {
      const completedAt = bindValues[0] === null ? null : String(bindValues[0]);
      const { error } = await supabase
        .from("routine_items")
        .update({ completed_at: completedAt, updated_at: new Date().toISOString() })
        .eq("id", Number(bindValues[1]));
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("UPDATE routine_items SET title")) {
      const { error } = await supabase
        .from("routine_items")
        .update({
          title: String(bindValues[0] ?? ""),
          updated_at: new Date().toISOString(),
        })
        .eq("id", Number(bindValues[1]));
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("DELETE FROM classes")) {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", Number(bindValues[0]));
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("DELETE FROM lessons")) {
      const { error } = await supabase
        .from("lessons")
        .delete()
        .eq("id", Number(bindValues[0]));
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("DELETE FROM segments")) {
      const { error } = await supabase
        .from("segments")
        .delete()
        .eq("id", Number(bindValues[0]));
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    if (normalized.startsWith("DELETE FROM routine_items")) {
      const { error } = await supabase
        .from("routine_items")
        .delete()
        .eq("id", Number(bindValues[0]));
      if (error) throw error;
      return { rowsAffected: 1 };
    }

    return { rowsAffected: 0 };
  }
}

function getRoutineResetStart(now = new Date()): Date {
  const reset = new Date(now);
  reset.setHours(6, 0, 0, 0);
  if (now < reset) reset.setDate(reset.getDate() - 1);
  return reset;
}

function formatRoutineDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRoutineDate(now = new Date()): string {
  return formatRoutineDate(getRoutineResetStart(now));
}

function isMissingRoutineCompletionsTable(error: { code?: string } | null): boolean {
  return error?.code === "PGRST205";
}

export async function ensureRoutineItems(): Promise<RoutineItem[]> {
  const db = await getDb();
  let rows = await db.select<RoutineItem[]>("SELECT * FROM routine_items ORDER BY sort_order, id");

  const shouldReplaceLegacyDefaults =
    rows.length === LEGACY_ROUTINE_TITLES.length &&
    rows.every((item, index) => item.title === LEGACY_ROUTINE_TITLES[index]);

  if (shouldReplaceLegacyDefaults) {
    await Promise.all(
      rows.map((item) => db.execute("DELETE FROM routine_items WHERE id = $1", [item.id]))
    );
    rows = [];
  }

  if (rows.length === 0) {
    await Promise.all(
      DEFAULT_ROUTINE_TITLES.map((title, index) =>
        db.execute("INSERT INTO routine_items (title, sort_order) VALUES ($1, $2)", [title, index])
      )
    );
    rows = await db.select<RoutineItem[]>("SELECT * FROM routine_items ORDER BY sort_order, id");
  }

  const resetStart = getRoutineResetStart().getTime();
  const staleCompleted = rows.filter((item) => item.completed_at && new Date(item.completed_at).getTime() < resetStart);
  if (staleCompleted.length > 0) {
    await Promise.all(
      staleCompleted.map((item) =>
        db.execute("UPDATE routine_items SET completed_at = $1 WHERE id = $2", [null, item.id])
      )
    );
    rows = await db.select<RoutineItem[]>("SELECT * FROM routine_items ORDER BY sort_order, id");
  }

  return rows;
}

export async function recordRoutineCompletion(routineItemId: number, completedAt = new Date()): Promise<void> {
  const userId = await getUserId();
  const routineDate = getRoutineDate(completedAt);
  const { error } = await supabase
    .from("routine_completions")
    .upsert(
      {
        user_id: userId,
        routine_item_id: routineItemId,
        routine_date: routineDate,
        completed_at: completedAt.toISOString(),
      },
      { onConflict: "user_id,routine_item_id,routine_date" }
    );
  if (isMissingRoutineCompletionsTable(error)) return;
  if (error) throw error;
}

export async function deleteRoutineCompletion(routineItemId: number, now = new Date()): Promise<void> {
  const routineDate = getRoutineDate(now);
  const { error } = await supabase
    .from("routine_completions")
    .delete()
    .eq("routine_item_id", routineItemId)
    .eq("routine_date", routineDate);
  if (isMissingRoutineCompletionsTable(error)) return;
  if (error) throw error;
}

export async function getRoutineCompletionCounts(startDate: string, endDate: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("routine_completions")
    .select("routine_date")
    .gte("routine_date", startDate)
    .lte("routine_date", endDate);
  if (isMissingRoutineCompletionsTable(error)) return new Map();
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Pick<RoutineCompletion, "routine_date">[]) {
    counts.set(row.routine_date, (counts.get(row.routine_date) ?? 0) + 1);
  }
  return counts;
}

export async function clearAllUserData(): Promise<void> {
  const { error: routineCompletionDeleteError } = await supabase.from("routine_completions").delete().gt("id", 0);
  if (routineCompletionDeleteError && !isMissingRoutineCompletionsTable(routineCompletionDeleteError)) {
    throw routineCompletionDeleteError;
  }
  await supabase.from("routine_items").delete().gt("id", 0);
  await supabase.from("study_sessions").delete().gt("id", 0);
  await supabase.from("segments").delete().gt("id", 0);
  await supabase.from("lessons").delete().gt("id", 0);
  await supabase.from("classes").delete().gt("id", 0);
}

export async function clearStudyHistory(): Promise<void> {
  await supabase.from("study_sessions").delete().gt("id", 0);
}
