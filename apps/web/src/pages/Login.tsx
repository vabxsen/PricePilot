import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "../components/ui/Button.js";
import { signInWithGoogle, useAuth } from "../lib/auth.js";
import { isFirebaseConfigured } from "../lib/firebase.js";

/** Official multi-color Google "G" mark. */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7955 2.7164v2.2581h2.9087c1.7018-1.5668 2.6832-3.874 2.6832-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2822-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </svg>
  );
}

export function Login() {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      // Redirect happens declaratively once auth state updates (see below).
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  // As soon as the auth context reflects a signed-in user, leave the login
  // page. Doing this declaratively (instead of navigate() right after the
  // await) avoids racing Firebase's onAuthStateChanged.
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <section className="mx-auto max-w-sm">
      <h1 className="text-center text-2xl font-bold text-ink">Sign in to PricePilot</h1>
      <p className="mt-2 text-center text-ink-muted">
        Track prices and get alerted when they drop.
      </p>

      <div className="mt-6 space-y-3">
        <Button
          variant="secondary"
          onClick={handleGoogle}
          disabled={!isFirebaseConfigured || busy}
          className="inline-flex w-full items-center justify-center gap-3"
        >
          <GoogleLogo />
          {busy ? "Signing in…" : "Continue with Google"}
        </Button>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {!isFirebaseConfigured && (
        <p className="mt-4 text-center text-xs text-ink-faint">
          Auth activates once Firebase env vars are set.
        </p>
      )}
    </section>
  );
}
