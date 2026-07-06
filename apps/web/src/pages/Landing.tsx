import { percentDrop } from "@pricepilot/shared";
import { useState } from "react";

/**
 * Landing with the "paste a URL" hero. The resolver is wired in S2;
 * for the S0 scaffold this validates the URL and shows the intended flow.
 */
export function Landing() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const u = new URL(url);
      setStatus(`Looks good — we'll resolve ${u.hostname} in S2. Sign in to start tracking.`);
    } catch {
      setStatus("Please paste a full product URL (including https://).");
    }
  }

  // Illustrative teaser using shared price logic.
  const exampleDrop = percentDrop(299, 229);

  return (
    <section className="mx-auto max-w-3xl text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Never overpay <span className="text-brand">again</span>.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-black/60 dark:text-white/60">
        Track any product's price across the web. PricePilot watches it for you and pings you the
        moment it drops.
      </p>

      <form onSubmit={onSubmit} className="mx-auto mt-8 flex max-w-xl gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a product URL…"
          className="flex-1 rounded-md border border-black/10 bg-surface px-4 py-3 outline-none focus:border-brand dark:border-white/15"
          aria-label="Product URL"
        />
        <button
          type="submit"
          className="rounded-md bg-brand px-5 py-3 font-medium text-white hover:opacity-90"
        >
          Track price
        </button>
      </form>

      {status && <p className="mt-4 text-sm text-black/70 dark:text-white/70">{status}</p>}

      <div className="mx-auto mt-12 grid max-w-xl grid-cols-3 gap-4 text-left">
        <Stat label="Example drop" value={`${exampleDrop}%`} tone="success" />
        <Stat label="Retailers" value="Growing" />
        <Stat label="Cost to you" value="$0" tone="success" />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="rounded-lg border border-black/5 bg-surface p-4 dark:border-white/10">
      <div className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
        {label}
      </div>
      <div
        className={`tabular mt-1 text-2xl font-semibold ${
          tone === "success" ? "text-success" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
