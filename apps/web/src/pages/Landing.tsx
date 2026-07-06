import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.js";

export function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      new URL(url); // validate before navigating
      setError(null);
      if (user) {
        navigate("/add", { state: { url } });
      } else {
        navigate("/login");
      }
    } catch {
      setError("Please paste a full product URL (including https://).");
    }
  }

  return (
    <section className="mx-auto max-w-3xl text-center">
      <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        Never overpay <span className="text-brand">again</span>.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-ink-muted">
        Track any product's price across the web. PricePilot watches it for you and pings you the
        moment it drops.
      </p>

      <form onSubmit={onSubmit} className="mx-auto mt-8 flex max-w-xl gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a product URL…"
          className="flex-1 rounded-md border border-border/15 bg-surface px-4 py-3 text-ink outline-none placeholder:text-ink-faint focus:border-brand"
          aria-label="Product URL"
        />
        <button
          type="submit"
          className="rounded-md bg-brand px-5 py-3 font-medium text-bg shadow-glow transition hover:bg-brand-hover"
        >
          Track price
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <div className="mx-auto mt-12 grid max-w-xl grid-cols-3 gap-4 text-left">
        <Stat label="Price history" value="Always on" />
        <Stat label="Alerts" value="Free" />
        <Stat label="Cost to you" value="$0" />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/10 bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="tabular mt-1 text-2xl font-semibold text-brand">{value}</div>
    </div>
  );
}
