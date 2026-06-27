import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { RoutinePanel } from "./RoutinePanel";

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isLessonPlayerPage = location.pathname.startsWith("/lesson/");

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
    </div>
  );
}
