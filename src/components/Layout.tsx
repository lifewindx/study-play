import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { RoutinePanel } from "./RoutinePanel";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden">
      <AppHeader />
      <main className="flex-1 overflow-auto px-5 py-6 sm:px-8">
        {children}
      </main>
      <RoutinePanel />
    </div>
  );
}
