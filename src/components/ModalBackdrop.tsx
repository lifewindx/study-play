import { useRef, type ReactNode } from "react";

interface ModalBackdropProps {
  children: ReactNode;
  onClose: () => void;
}

export function ModalBackdrop({ children, onClose }: ModalBackdropProps) {
  const pointerStartedOnBackdropRef = useRef(false);

  return (
    <div
      className="modal-backdrop"
      onPointerDown={(event) => {
        pointerStartedOnBackdropRef.current = event.target === event.currentTarget;
      }}
      onPointerUp={(event) => {
        const shouldClose = pointerStartedOnBackdropRef.current && event.target === event.currentTarget;
        pointerStartedOnBackdropRef.current = false;
        if (shouldClose) onClose();
      }}
      onPointerCancel={() => {
        pointerStartedOnBackdropRef.current = false;
      }}
    >
      {children}
    </div>
  );
}
