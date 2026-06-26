import { useCallback, useEffect, useState } from "react";

export type CardViewMode = "list" | "grid2" | "grid3";

const STORAGE_KEY = "studyplay-card-view-mode";
const LEGACY_STORAGE_KEY = "studyplay-lesson-view-mode";
const CLASS_SETTINGS_STORAGE_PREFIX = "studyplay-class-lesson-view-settings:";

interface ClassLessonViewSettings {
  viewMode: CardViewMode;
  sortByDifficulty: boolean;
}

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

function getClassSettingsStorageKey(classId: string): string {
  return `${CLASS_SETTINGS_STORAGE_PREFIX}${classId}`;
}

function getStoredClassLessonViewSettings(classId: string | undefined): ClassLessonViewSettings {
  const fallback: ClassLessonViewSettings = {
    viewMode: getStoredViewMode(),
    sortByDifficulty: false,
  };
  if (!classId) return fallback;

  try {
    const storedSettings = localStorage.getItem(getClassSettingsStorageKey(classId));
    if (!storedSettings) return fallback;
    const parsed = JSON.parse(storedSettings) as Partial<ClassLessonViewSettings>;
    const parsedViewMode = parsed.viewMode ?? null;
    return {
      viewMode: isCardViewMode(parsedViewMode) ? parsedViewMode : fallback.viewMode,
      sortByDifficulty: typeof parsed.sortByDifficulty === "boolean" ? parsed.sortByDifficulty : fallback.sortByDifficulty,
    };
  } catch {
    return fallback;
  }
}

function saveClassLessonViewSettings(classId: string | undefined, settings: ClassLessonViewSettings) {
  if (!classId) return;
  try {
    localStorage.setItem(getClassSettingsStorageKey(classId), JSON.stringify(settings));
  } catch {
    // Keep the current-session setting when storage is unavailable.
  }
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

export function useClassLessonViewSettings(classId: string | undefined) {
  const [settings, setSettings] = useState<ClassLessonViewSettings>(() => getStoredClassLessonViewSettings(classId));

  useEffect(() => {
    setSettings(getStoredClassLessonViewSettings(classId));
  }, [classId]);

  const changeViewMode = useCallback((viewMode: CardViewMode) => {
    setSettings((current) => {
      const next = { ...current, viewMode };
      saveClassLessonViewSettings(classId, next);
      return next;
    });
  }, [classId]);

  const changeSortByDifficulty = useCallback((sortByDifficulty: boolean) => {
    setSettings((current) => {
      const next = { ...current, sortByDifficulty };
      saveClassLessonViewSettings(classId, next);
      return next;
    });
  }, [classId]);

  return {
    viewMode: settings.viewMode,
    sortByDifficulty: settings.sortByDifficulty,
    changeViewMode,
    changeSortByDifficulty,
  };
}

export function getCardGridClassName(viewMode: CardViewMode): string {
  if (viewMode === "list") return "grid gap-3";
  if (viewMode === "grid2") return "grid gap-4 sm:grid-cols-2";
  return "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";
}
