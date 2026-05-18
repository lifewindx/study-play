import { useCallback, useEffect, useState } from "react";
import type { StudySession } from "../types";
import { getDb } from "../lib/db";

interface SessionRow extends StudySession {
  lesson_title: string;
  class_title: string;
}

interface DayData {
  date: string;
  totalMinutes: number;
  label: string;
}

export function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [days, setDays] = useState<DayData[]>([]);

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

    // Aggregate by day with one label per day showing "class > lesson".
    const dayMap = new Map<string, DayData>();
    for (const row of rows) {
      const dateKey = row.started_at.slice(0, 10);
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, {
          date: dateKey,
          totalMinutes: 0,
          label: `${row.class_title} > ${row.lesson_title}`,
        });
      }
      const entry = dayMap.get(dateKey)!;
      entry.totalMinutes += Math.round(row.duration_seconds / 60);
    }

    setDays(Array.from(dayMap.values()));
  }, [year, month]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

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
        <button onClick={() => changeMonth(-1)}
          className="btn-ghost text-sm">
          Previous
        </button>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {year}. {String(month).padStart(2, "0")}
        </h2>
        <button onClick={() => changeMonth(1)}
          className="btn-ghost text-sm">
          Next
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
              className="aspect-square p-1.5 border-b border-r relative"
              style={{
                borderColor: "var(--border-color)",
                backgroundColor: "var(--bg-primary)",
              }}>
              <span className={`text-xs ${isToday ? "font-bold" : ""}`}
                style={{ color: isToday ? "var(--accent)" : "var(--text-primary)" }}>
                {day}
              </span>
              {data && (
                <div className="absolute inset-x-1 top-7">
                  <div className="mb-1 flex gap-0.5">
                    {Array.from({ length: Math.min(3, Math.ceil(data.totalMinutes / 15)) }).map((_, j) => (
                      <div key={j} className="flex-1 h-1 rounded-full"
                        style={{ backgroundColor: "var(--accent)" }} />
                    ))}
                  </div>
                  <div className="text-[9px] leading-tight truncate"
                    style={{ color: "var(--text-secondary)" }}>
                    {data.label}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
