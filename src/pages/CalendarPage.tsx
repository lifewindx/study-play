import { useCallback, useEffect, useMemo, useState } from "react";
import type { Class, StudySession } from "../types";
import { getDb } from "../lib/db";
import { ChevronLeftIcon, ChevronRightIcon } from "../components/Icons";

interface SessionRow extends StudySession {
  lesson_title: string;
  class_id: number;
  class_title: string;
}

interface DayData {
  date: string;
  totalMinutes: number;
  sessionCount: number;
}

interface CalendarCell {
  date: string;
  day: number;
  month: number;
  inYear: boolean;
}

const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateFromString(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildYearGrid(year: number): CalendarCell[][] {
  const firstDay = new Date(year, 0, 1);
  const lastDay = new Date(year, 11, 31);
  const gridStart = addDays(firstDay, -firstDay.getDay());
  const gridEnd = addDays(lastDay, 6 - lastDay.getDay());
  const weeks: CalendarCell[][] = [];

  for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    const weekIndex = Math.floor((cursor.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
    if (!weeks[weekIndex]) weeks[weekIndex] = [];
    weeks[weekIndex].push({
      date: formatDate(cursor),
      day: cursor.getDate(),
      month: cursor.getMonth(),
      inYear: cursor.getFullYear() === year,
    });
  }

  return weeks;
}

function formatMin(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getIntensity(totalMinutes: number): number {
  if (totalMinutes <= 0) return 0;
  if (totalMinutes < 15) return 1;
  if (totalMinutes < 30) return 2;
  if (totalMinutes < 60) return 3;
  return 4;
}

function getCellColor(level: number): string {
  switch (level) {
    case 1:
      return "rgba(17, 137, 91, 0.26)";
    case 2:
      return "rgba(17, 137, 91, 0.46)";
    case 3:
      return "rgba(17, 137, 91, 0.68)";
    case 4:
      return "var(--success)";
    default:
      return "var(--bg-tertiary)";
  }
}

export function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [days, setDays] = useState<DayData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<SessionRow[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadClasses = useCallback(async () => {
    const db = await getDb();
    const rows = await db.select<Class[]>("SELECT * FROM classes ORDER BY sort_order, id");
    setClasses(rows);
  }, []);

  const loadYearData = useCallback(async () => {
    const db = await getDb();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const rows = await db.select<SessionRow[]>(
      `SELECT ss.*, l.title as lesson_title, l.class_id as class_id, c.title as class_title
       FROM study_sessions ss
       JOIN lessons l ON l.id = ss.lesson_id
       JOIN classes c ON c.id = l.class_id
       WHERE date(ss.started_at) >= $1 AND date(ss.started_at) <= $2
         AND ($3 IS NULL OR c.id = $3)
       ORDER BY ss.started_at DESC`,
      [startDate, endDate, selectedClassId]
    );

    const dayMap = new Map<string, DayData>();
    for (const row of rows) {
      const dateKey = row.started_at.slice(0, 10);
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, {
          date: dateKey,
          totalMinutes: 0,
          sessionCount: 0,
        });
      }
      const entry = dayMap.get(dateKey)!;
      entry.totalMinutes += Math.round(row.duration_seconds / 60);
      entry.sessionCount += 1;
    }

    setDays(Array.from(dayMap.values()));
  }, [selectedClassId, year]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    loadYearData();
  }, [loadYearData]);

  async function openDateDetail(dateStr: string) {
    setSelectedDate(dateStr);
    setLoadingDetail(true);

    try {
      const db = await getDb();
      const rows = await db.select<SessionRow[]>(
        `SELECT ss.*, l.title as lesson_title, l.class_id as class_id, c.title as class_title
         FROM study_sessions ss
         JOIN lessons l ON l.id = ss.lesson_id
         JOIN classes c ON c.id = l.class_id
         WHERE date(ss.started_at) >= $1 AND date(ss.started_at) <= $2
           AND ($3 IS NULL OR c.id = $3)
         ORDER BY ss.started_at DESC`,
        [dateStr, dateStr, selectedClassId]
      );
      setSelectedSessions(rows);
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeDetail() {
    setSelectedDate(null);
    setSelectedSessions([]);
  }

  const grid = useMemo(() => buildYearGrid(year), [year]);
  const dayMap = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const today = formatDate(new Date());
  const activeDays = days.length;
  const totalMinutes = days.reduce((sum, day) => sum + day.totalMinutes, 0);
  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let cursor = dateFromString(today); cursor.getFullYear() === year; cursor = addDays(cursor, -1)) {
      const date = formatDate(cursor);
      if (!dayMap.has(date)) break;
      streak += 1;
    }
    return streak;
  }, [dayMap, today, year]);

  return (
    <div className="page-shell">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-title mb-2">History</p>
          <h1 className="text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Study calendar
          </h1>
        </div>

        <select
          value={selectedClassId ?? ""}
          onChange={(event) => setSelectedClassId(event.target.value ? Number(event.target.value) : null)}
          className="input-field w-full sm:w-64"
          aria-label="Filter by class"
        >
          <option value="">All classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.title}
            </option>
          ))}
        </select>
      </div>

      <div
        className="rounded-lg border p-4"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setYear(year - 1)} className="icon-button" aria-label="Previous year">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <h2 className="min-w-20 text-center text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {year}
            </h2>
            <button onClick={() => setYear(year + 1)} className="icon-button" aria-label="Next year">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm sm:flex sm:items-center sm:gap-5">
            <div>
              <span className="block text-xs" style={{ color: "var(--text-muted)" }}>Active</span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{activeDays}d</span>
            </div>
            <div>
              <span className="block text-xs" style={{ color: "var(--text-muted)" }}>Time</span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{formatMin(totalMinutes)}</span>
            </div>
            <div>
              <span className="block text-xs" style={{ color: "var(--text-muted)" }}>Streak</span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{currentStreak}d</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[780px]">
            <div
              className="mb-2 grid gap-1 pl-9 text-xs"
              style={{
                gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))`,
                color: "var(--text-muted)",
              }}
            >
              {grid.map((week, index) => {
                const firstOfMonth = week.find((cell) => cell.inYear && cell.day <= 7);
                return (
                  <span key={index} className="h-4">
                    {firstOfMonth ? monthLabels[firstOfMonth.month] : ""}
                  </span>
                );
              })}
            </div>

            <div className="flex gap-2">
              <div className="grid grid-rows-7 gap-1 pt-px text-right text-xs" style={{ color: "var(--text-muted)" }}>
                {dayLabels.map((label, index) => (
                  <span key={index} className="h-3 leading-3">
                    {label}
                  </span>
                ))}
              </div>

              <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }}>
                {grid.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-rows-7 gap-1">
                    {week.map((cell) => {
                      const data = dayMap.get(cell.date);
                      const level = getIntensity(data?.totalMinutes ?? 0);
                      const isToday = cell.date === today;
                      const isClickable = cell.inYear && data;

                      return (
                        <button
                          key={cell.date}
                          type="button"
                          onClick={() => isClickable && openDateDetail(cell.date)}
                          disabled={!isClickable}
                          title={
                            data
                              ? `${cell.date}: ${formatMin(data.totalMinutes)} in ${data.sessionCount} sessions`
                              : cell.inYear
                                ? `${cell.date}: no practice`
                                : ""
                          }
                          className="h-3 rounded-[3px] border transition-transform enabled:hover:scale-110"
                          style={{
                            backgroundColor: cell.inYear ? getCellColor(level) : "transparent",
                            borderColor: isToday ? "var(--accent)" : cell.inYear ? "var(--border-color)" : "transparent",
                            cursor: isClickable ? "pointer" : "default",
                          }}
                          aria-label={data ? `${cell.date}, ${formatMin(data.totalMinutes)}` : `${cell.date}, no practice`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className="h-3 w-3 rounded-[3px] border"
              style={{
                backgroundColor: getCellColor(level),
                borderColor: "var(--border-color)",
              }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {selectedDate && (
        <div className="modal-backdrop" onClick={closeDetail}>
          <div className="modal-card max-w-md" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                {selectedDate}
              </h2>
              <button onClick={closeDetail} className="icon-button" aria-label="Close">
                <ChevronRightIcon className="h-5 w-5 rotate-90" />
              </button>
            </div>
            {loadingDetail ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
            ) : selectedSessions.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No study sessions on this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-lg border p-3"
                    style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}
                  >
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {session.class_title} &gt; {session.lesson_title}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      {session.started_at.slice(11, 16)} · {formatMin(Math.round(session.duration_seconds / 60))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
