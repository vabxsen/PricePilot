import { isFirebaseConfigured } from "../lib/firebase.js";

/** Watchlist grid — wired to Firestore in S2. Placeholder for S0. */
export function Dashboard() {
  return (
    <section>
      <h1 className="text-2xl font-bold">Your watchlist</h1>
      <p className="mt-2 text-black/60 dark:text-white/60">
        Products you track will appear here with live prices and target progress.
      </p>

      {!isFirebaseConfigured && (
        <div className="mt-6 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
          <strong>Firebase not configured yet.</strong> Add your <code>VITE_FIREBASE_*</code> values
          to <code>apps/web/.env.local</code> (see <code>.env.example</code>) to enable auth and the
          live dashboard in S1.
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-dashed border-black/15 p-8 text-center text-black/40 dark:border-white/15 dark:text-white/40"
          >
            Tracked product #{i}
          </div>
        ))}
      </div>
    </section>
  );
}
