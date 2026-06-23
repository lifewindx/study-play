import { useCallback, useState } from "react";

export type CardViewMode = "list" | "grid2" | "grid3";

const STORAGE_KEY = "studyplay-card-view-mode";
const LEGACY_STORAGE_KEY = "studyplay-lesson-view-mode";

function isCardViewMode(value: string | null): value is CardViewMode {
  return value === "list" || value === "grid2" || value === "grid3";
}

function getStoredViewMode(): CardViewMode {
  try {
    const storedMode = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (isCardViewMode(storedMode)) return storedMode;
  } catch {
    // Fall back to the default when storage is unavailable.
  }
  return "grid2";
}

export function useCardViewMode() {
  const [viewMode, setViewMode] = useState<CardViewMode>(getStoredViewMode);

  const changeViewMode = useCallback((mode: CardViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Keep the current-session setting when storage is unavailable.
    }
  }, []);

  return { viewMode, changeViewMode };
}

export function getCardGridClassName(viewMode: CardViewMode): string {
  if (viewMode === "list") return "grid gap-3";
  if (viewMode === "grid2") return "grid gap-4 sm:grid-cols-2";
  return "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";
}
