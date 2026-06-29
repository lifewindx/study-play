import { api } from "./api";
import type { RoutineItem } from "../types";

interface StudyDb {
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
  execute(query: string, bindValues?: unknown[]): Promise<unknown>;
}

class ApiDB implements StudyDb {
  async select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
    const result = await api<{ data: T }>("/api/db/select", {
      method: "POST",
      body: { query, bindValues },
    });
    return result.data;
  }

  async execute(query: string, bindValues: unknown[] = []): Promise<unknown> {
    const result = await api<{ data: unknown }>("/api/db/execute", {
      method: "POST",
      body: { query, bindValues },
    });
    return result.data;
  }
}

const db = new ApiDB();

export async function getDb(): Promise<StudyDb> {
  return db;
}

const DEFAULT_ROUTINE_TITLES = [
  "스케일", "펜타", "CCM", "코드톤", "Backing", "트라이어드",
  "드롭2", "드롭3", "마이너스케일들", "모드", "재마클",
];

const LEGACY_ROUTINE_TITLES = [
  "손 풀기와 튜닝",
  "느린 템포로 핵심 구간 반복",
  "원곡 속도로 이어서 연주",
  "오늘 어려웠던 부분 메모",
];

export async function ensureAllSegmentsForLessons(lessonIds: number[]): Promise<number> {
  const result = await api<{ count: number }>("/api/segments/ensure-all", {
    method: "POST",
    body: { lessonIds },
  });
  return result.count;
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

export async function ensureRoutineItems(): Promise<RoutineItem[]> {
  let rows = await db.select<RoutineItem[]>("SELECT * FROM routine_items ORDER BY sort_order, id");
  const replaceLegacy = rows.length === LEGACY_ROUTINE_TITLES.length &&
    rows.every((item, index) => item.title === LEGACY_ROUTINE_TITLES[index]);
  if (replaceLegacy) {
    await Promise.all(rows.map((item) => db.execute("DELETE FROM routine_items WHERE id = $1", [item.id])));
    rows = [];
  }
  if (rows.length === 0) {
    await Promise.all(DEFAULT_ROUTINE_TITLES.map((title, index) =>
      db.execute("INSERT INTO routine_items (title, sort_order) VALUES ($1, $2)", [title, index])));
    rows = await db.select<RoutineItem[]>("SELECT * FROM routine_items ORDER BY sort_order, id");
  }
  const resetStart = getRoutineResetStart().getTime();
  const stale = rows.filter((item) => item.completed_at && new Date(item.completed_at).getTime() < resetStart);
  if (stale.length > 0) {
    await Promise.all(stale.map((item) =>
      db.execute("UPDATE routine_items SET completed_at = $1 WHERE id = $2", [null, item.id])));
    rows = await db.select<RoutineItem[]>("SELECT * FROM routine_items ORDER BY sort_order, id");
  }
  return rows;
}

export async function recordRoutineCompletion(routineItemId: number, completedAt = new Date()): Promise<void> {
  await api(`/api/routines/${routineItemId}/completion`, {
    method: "PUT",
    body: { routineDate: getRoutineDate(completedAt), completedAt: completedAt.toISOString() },
  });
}

export async function deleteRoutineCompletion(routineItemId: number, now = new Date()): Promise<void> {
  await api(`/api/routines/${routineItemId}/completion?date=${encodeURIComponent(getRoutineDate(now))}`, {
    method: "DELETE",
  });
}

export async function getRoutineCompletionCounts(startDate: string, endDate: string): Promise<Map<string, number>> {
  const result = await api<{ data: Array<{ routine_date: string; count: number }> }>(
    `/api/routines/completion-counts?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
  );
  return new Map(result.data.map((row) => [String(row.routine_date).slice(0, 10), Number(row.count)]));
}

export async function clearAllUserData(): Promise<void> {
  await api("/api/account/data", { method: "DELETE" });
}

export async function clearStudyHistory(): Promise<void> {
  await api("/api/study-history", { method: "DELETE" });
}
