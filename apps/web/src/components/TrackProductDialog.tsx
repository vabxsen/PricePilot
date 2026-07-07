import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../lib/auth.js";
import { resolveProductUrl } from "../lib/resolver.js";
import { addTrackerForProduct } from "../lib/trackers.js";
import { Button } from "./ui/Button.js";
import { Input } from "./ui/Input.js";

/**
 * Quick "track a product" popup — paste a link, hit Track, done. Resolves
 * and creates the tracker in one step (no preview, no target price; that
 * richer flow still lives at /add). Closes back to wherever it was opened
 * from on success — deliberately never navigates away, since the whole
 * point is a fast add without leaving the page you're on. Portal-rendered
 * to document.body so it isn't trapped by an ancestor's CSS containing
 * block (the same fix ConfirmDialog/InfoDialog needed).
 */
export function TrackProductDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (status === "working") return;
    onClose();
  }

  async function handleTrack(e: FormEvent) {
    e.preventDefault();
    if (!user || !url.trim()) return;
    setStatus("working");
    setError(null);
    try {
      const resolved = await resolveProductUrl(url.trim());
      await addTrackerForProduct(user.uid, resolved);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setStatus("idle");
    }
  }

  // Reset to a blank slate each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setUrl("");
    setError(null);
    setStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Re-attached whenever `status` changes so the closure always sees the
  // current value — otherwise Escape could close the dialog mid-request.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="track-dialog-title"
        className="w-full max-w-sm rounded-lg border border-border/10 bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="track-dialog-title" className="text-base font-semibold text-ink">
          Track a product
        </h2>
        <form onSubmit={handleTrack} className="mt-4">
          <Input
            type="url"
            required
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste your product link here"
            disabled={status === "working"}
          />
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-4 flex items-center gap-2">
            <Button
              type="submit"
              disabled={status === "working" || !url.trim()}
              className="flex-1"
            >
              {status === "working" ? "Tracking…" : "Track"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={status === "working"}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
