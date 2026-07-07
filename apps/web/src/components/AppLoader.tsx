/**
 * Full-screen branded splash shown while Firebase Auth restores the persisted
 * session on load/refresh. Replaces the bare "Loading…" text that otherwise
 * flashed as small text on an empty black screen.
 */
export function AppLoader() {
  return (
    <div className="grid min-h-screen w-full place-items-center bg-bg">
      <div className="flex flex-col items-center gap-5">
        <img src="/logo.png" alt="PricePilot" className="h-16 w-16 rounded-2xl" />
        <div
          role="status"
          aria-label="Loading"
          className="h-5 w-5 animate-spin rounded-full border-2 border-brand/25 border-t-brand"
        />
      </div>
    </div>
  );
}
