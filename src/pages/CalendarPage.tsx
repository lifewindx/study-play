import { useCallback, useEffect, useState } from "react";
import type { StudySession } from "../types";
import { getDb } from "../lib/db";
import { ChevronLeftIcon, ChevronRightIcon } from "../components/Icons";

interface SessionRow extends StudySession {
  lesson_title: string;
  class_title: string;
}

interface DayData {
  date: string;
  totalMinutes: number;
  classTitles: string[];
}

const circleColors = [
  "var(--accent)",
  "var(--violet)",
  "var(--success)",
  "var(--warning)",
  "#f06090",
  "#30c0d0",
];

export function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [days, setDays] = useState<DayData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<SessionRow[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadMonthData = useCallback(async () => {
    const db = await getDb();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    const rows = await db.select<SessionRow[]>(
      `SELECT ss.*, l.title as lesson_title, c.title as class_title
       FROM study_sessions ss
       JOIN lessons l ON l.id = ss.lesson_id
       JOIN classes c ON c.id = l.class_id
       WHERE date(ss.started_at) >= $1 AND date(ss.started_at) <= $2
       ORDER BY ss.started_at DESC`,
      [startDate, endDate]
    );

    const dayMap = new Map<string, DayData>();
    for (const row of rows) {
      const dateKey = row.started_at.slice(0, 10);
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, {
          date: dateKey,
          totalMinutes: 0,
          classTitles: [],
        });
      }
      const entry = dayMap.get(dateKey)!;
      entry.totalMinutes += Math.round(row.duration_seconds / 60);
      if (!entry.classTitles.includes(row.class_title)) {
        entry.classTitles.push(row.class_title);
      }
    }

    setDays(Array.from(dayMap.values()));
  }, [year, month]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  async function openDateDetail(dateStr: string) {
    setSelectedDate(dateStr);
    setLoadingDetail(true);
    const db = await getDb();
    const rows = await db.select<SessionRow[]>(
      `SELECT ss.*, l.title as lesson_title, c.title as class_title
       FROM study_sessions ss
       JOIN lessons l ON l.id = ss.lesson_id
       JOIN classes c ON c.id = l.class_id
       WHERE date(ss.started_at) = $1
       ORDER BY ss.started_at DESC`,
      [dateStr]
    );
    setSelectedSessions(rows);
    setLoadingDetail(false);
  }

  function closeDetail() {
    setSelectedDate(null);
    setSelectedSessions([]);
  }

  function getDaysInMonth(y: number, m: number): number {
    return new Date(y, m, 0).getDate();
  }

  function getFirstDayOfMonth(y: number, m: number): number {
    return new Date(y, m - 1, 1).getDay();
  }

  function changeMonth(delta: number) {
    const newMonth = month + delta;
    if (newMonth > 12) {
      setYear(year + 1);
      setMonth(1);
    } else if (newMonth < 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(newMonth);
    }
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date().toISOString().slice(0, 10);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function formatMin(min: number): string {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  return (
    <div className="page-shell">
      <div className="mb-6">
        <p className="section-title mb-2">History</p>
        <h1 className="text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Study calendar
        </h1>
      </div>

      <div
        className="flex items-center justify-between rounded-t-lg border p-4"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border-color)",
        }}
      >
        <button onClick={() => changeMonth(-1)} className="icon-button" aria-label="Previous month">
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {year}. {String(month).padStart(2, "0")}
        </h2>
        <button onClick={() => changeMonth(1)} className="icon-button" aria-label="Next month">
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div
        className="grid grid-cols-7 border-l border-r border-b rounded-b-lg"
        style={{ borderColor: "var(--border-color)" }}
      >
        {dayNames.map((name) => (
          <div key={name}
            className="text-center text-xs font-medium py-2 border-b"
            style={{
              borderColor: "var(--border-color)",
              color: "var(--text-secondary)",
              backgroundColor: "var(--bg-secondary)",
            }}>
            {name}
          </div>
        ))}

        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e-${i}`} className="aspect-square border-b border-r"
            style={{ borderColor: "var(--border-color)" }} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const data = days.find((d) => d.date === dateStr);
          const isToday = dateStr === today;

          return (
            <div key={day}
              onClick={() => data && openDateDetail(dateStr)}
              className={"aspect-square p-1.5 border-b border-r relative" + (data ? " cursor-pointer hover:bg-[var(--bg-tertiary)]" : "")}
              style={{
                borderColor: "var(--border-color)",
                backgroundColor: "var(--bg-primary)",
              }}>
              <span className={"text-xs" + (isToday ? " font-bold" : "")}
                style={{ color: isToday ? "var(--accent)" : "var(--text-primary)" }}>
                {day}
              </span>
              {data && data.classTitles.length > 0 && (
                <div className="absolute bottom-1.5 inset-x-1.5 flex justify-center gap-0.5">
                  {data.classTitles.slice(0, 4).map((_, j) => (
                    <span key={j}
                      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: circleColors[j % circleColors.length] }}
                    />
                  ))}
                  {data.classTitles.length > 4 && (
                    <span className="text-[7px] leading-none" style={{ color: "var(--text-muted)" }}>
                      +{data.classTitles.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="modal-backdrop" onClick={closeDetail}>
          <div className="modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
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
                {selectedSessions.map((s) => (
                  <div key={s.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {s.class_title} › {s.lesson_title}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {s.started_at.slice(11, 16)} · {formatMin(Math.round(s.duration_seconds / 60))}
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
