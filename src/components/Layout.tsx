import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { RoutinePanel } from "./RoutinePanel";
import { Footer } from "./Footer";

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isLessonPlayerPage = location.pathname.startsWith("/lesson/");

  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden">
      {!isLessonPlayerPage && <AppHeader />}
      <div className="app-scroll min-h-0 flex-1 overflow-auto">
        <div className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col">
          <main className={`flex w-full flex-1 flex-col px-5 sm:px-8 ${isLessonPlayerPage ? "py-4" : "py-6 sm:py-8"}`}>
            {children}
            <Footer />
          </main>
          {!isLessonPlayerPage && <RoutinePanel />}
        </div>
      </div>
    </div>
  );
}
