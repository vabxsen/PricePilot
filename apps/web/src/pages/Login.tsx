import { isFirebaseConfigured } from "../lib/firebase.js";

/** Firebase Auth (Google + email) is wired in S1. Placeholder for S0. */
export function Login() {
  return (
    <section className="mx-auto max-w-sm text-center">
      <h1 className="text-2xl font-bold">Sign in to PricePilot</h1>
      <p className="mt-2 text-black/60 dark:text-white/60">
        Sign in to start tracking prices and get alerts.
      </p>

      <div className="mt-6 space-y-3">
        <button
          disabled={!isFirebaseConfigured}
          className="w-full rounded-md border border-black/10 bg-surface px-4 py-3 font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5"
        >
          Continue with Google
        </button>
        <button
          disabled={!isFirebaseConfigured}
          className="w-full rounded-md bg-brand px-4 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Continue with email
        </button>
      </div>

      {!isFirebaseConfigured && (
        <p className="mt-4 text-xs text-black/50 dark:text-white/50">
          Auth activates once Firebase env vars are set (S1).
        </p>
      )}
    </section>
  );
}
