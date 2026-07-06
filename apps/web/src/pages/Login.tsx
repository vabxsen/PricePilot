import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "../lib/auth.js";
import { isFirebaseConfigured } from "../lib/firebase.js";

export function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      navigate("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") await signUpWithEmail(email, password);
      else await signInWithEmail(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-sm">
      <h1 className="text-center text-2xl font-bold text-ink">
        {mode === "signup" ? "Create your account" : "Sign in to PricePilot"}
      </h1>
      <p className="mt-2 text-center text-ink-muted">
        Track prices and get alerted when they drop.
      </p>

      <div className="mt-6 space-y-3">
        <button
          onClick={handleGoogle}
          disabled={!isFirebaseConfigured || busy}
          className="w-full rounded-md border border-border/15 bg-surface px-4 py-3 font-medium text-ink transition hover:bg-surface-raised disabled:opacity-50"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-xs text-ink-faint">
          <div className="h-px flex-1 bg-border/10" />
          or
          <div className="h-px flex-1 bg-border/10" />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border/15 bg-surface px-4 py-3 text-ink outline-none placeholder:text-ink-faint focus:border-brand"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border/15 bg-surface px-4 py-3 text-ink outline-none placeholder:text-ink-faint focus:border-brand"
          />
          <button
            type="submit"
            disabled={!isFirebaseConfigured || busy}
            className="w-full rounded-md bg-brand px-4 py-3 font-medium text-bg shadow-glow transition hover:bg-brand-hover disabled:opacity-50"
          >
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        {error && <p className="text-sm text-brand">{error}</p>}

        <button
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="w-full text-center text-sm text-brand hover:underline"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>

      {!isFirebaseConfigured && (
        <p className="mt-4 text-center text-xs text-ink-faint">
          Auth activates once Firebase env vars are set.
        </p>
      )}
    </section>
  );
}
