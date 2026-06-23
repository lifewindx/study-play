import { useState } from "react";
import { ModalBackdrop } from "./ModalBackdrop";

interface LessonFormData {
  title: string;
  videoUrl: string;
}

interface LessonFormModalProps {
  mode: "create" | "edit";
  initialTitle?: string;
  initialVideoUrl?: string;
  onClose: () => void;
  onSubmit: (data: LessonFormData) => Promise<string | void>;
}

export function LessonFormModal({
  mode,
  initialTitle = "",
  initialVideoUrl = "",
  onClose,
  onSubmit,
}: LessonFormModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit() {
    if (!videoUrl.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const submitError = await onSubmit({ title: title.trim(), videoUrl: videoUrl.trim() });
      if (submitError) setErrorMessage(submitError);
    } catch (error) {
      console.error(error);
      setErrorMessage("저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal-card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {mode === "edit" ? "Edit lesson" : "New lesson"}
          </h2>
          <p className="mt-1 text-xs sm:text-sm" style={{ color: "var(--text-muted)" }}>
            {mode === "edit"
              ? "Changing the link may shift segment timing."
              : "Add a YouTube link for focused loop practice."}
          </p>
        </div>
        <input
          type="text"
          placeholder="Lesson title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="input-field mb-3"
          maxLength={100}
          autoFocus
        />
        <input
          type="text"
          placeholder="YouTube URL (e.g., https://youtube.com/watch?v=...)"
          value={videoUrl}
          onChange={(event) => {
            setVideoUrl(event.target.value);
            setErrorMessage("");
          }}
          className={`input-field ${errorMessage ? "mb-2" : "mb-4"}`}
          maxLength={2000}
          pattern="https?://.+"
          aria-invalid={Boolean(errorMessage)}
        />
        {errorMessage && (
          <p className="mb-4 text-xs font-medium text-red-500" role="alert">
            {errorMessage}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost" disabled={isSubmitting}>Cancel</button>
          <button onClick={handleSubmit} className="btn-primary" disabled={isSubmitting || !videoUrl.trim()}>
            {isSubmitting ? "Saving..." : mode === "edit" ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
