import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button.js";

/**
 * Simple informational popup (single "Close" action) — for content, not a
 * decision. Shares ConfirmDialog's portal-to-body approach: several call
 * sites live inside a `.animate-fade-up` section, and transform-based CSS
 * animations establish a containing block for `position: fixed`
 * descendants, which would otherwise trap the modal instead of covering the
 * full viewport.
 */
export function InfoDialog({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-lg border border-border/10 bg-surface p-6 text-center shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <Button variant="secondary" size="md" onClick={onClose} className="mt-5 w-full">
          Close
        </Button>
      </div>
    </div>,
    document.body,
  );
}
