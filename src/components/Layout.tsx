import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { RoutinePanel } from "./RoutinePanel";

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isLessonPlayerPage = location.pathname.startsWith("/lesson/");
  const buildTime = new Date(__BUILD_TIME__).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden">
      {!isLessonPlayerPage && <AppHeader />}
      <div className="app-scroll min-h-0 flex-1 overflow-auto">
        <div className="relative mx-auto w-full max-w-6xl">
          <main className={`w-full px-5 sm:px-8 ${isLessonPlayerPage ? "py-3" : "py-6"}`}>
            {children}
          </main>
          <RoutinePanel />
        </div>
      </div>
      <footer
        className="shrink-0 px-3 py-1 text-center text-[10px]"
        style={{ color: "var(--text-muted)" }}
        title={`빌드 시각: ${buildTime}`}
      >
        StudyPlay v{__APP_VERSION__} · {buildTime}
      </footer>
    </div>
  );
}
