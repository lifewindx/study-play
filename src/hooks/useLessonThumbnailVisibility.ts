import { useCallback, useState } from "react";

const STORAGE_KEY = "studyplay-show-lesson-thumbnails";

function getStoredThumbnailVisibility(): boolean {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
  } catch {
    // Fall back to the default when storage is unavailable.
  }
  return true;
}

export function useLessonThumbnailVisibility() {
  const [showLessonThumbnails, setShowLessonThumbnails] = useState(getStoredThumbnailVisibility);

  const toggleShowLessonThumbnails = useCallback(() => {
    setShowLessonThumbnails((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Keep the current-session setting when storage is unavailable.
      }
      return next;
    });
  }, []);

  return { showLessonThumbnails, toggleShowLessonThumbnails };
}
