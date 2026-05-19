import { createClient } from "@supabase/supabase-js";

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
      let query = supabase
        .from("study_sessions")
        .select("*, lessons!inner(title, classes!inner(title))")
        .order("started_at", { ascending: false });

      if (endDate) {
        query = query.gte("started_at", startDate).lte("started_at", endDate + "T23:59:59");
      } else {
        const nextDay = new Date(startDate + "T00:00:00");
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().slice(0, 10);
        query = query.gte("started_at", startDate).lt("started_at", nextDayStr);
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? [])
        .filter((s) => s.lessons && s.lessons.classes)
        .map((s) => ({
          ...s,
          lesson_title: (s.lessons as { title: string }).title ?? "",
          class_title: ((s.lessons as { classes: { title: string } }).classes as { title: string }).title ?? "",
        }));
      return rows as T;
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
      const { error } = await supabase.from("lessons").insert({
        user_id: userId,
        class_id: Number(bindValues[0]),
        title: String(bindValues[1]),
        video_url: String(bindValues[2]),
        video_type: bindValues[3] === "local" ? "local" : "youtube",
        sort_order: Number(bindValues[4] ?? 0),
      });
      if (error) throw error;
      return { rowsAffected: 1 };
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

    return { rowsAffected: 0 };
  }
}
