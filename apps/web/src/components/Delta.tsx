/**
 * Price drops use the brand accent (the "hot deal" signal — this app's whole
 * point is drops, so they get the hero color). Increases stay quiet/muted:
 * nothing to celebrate, so nothing fights for attention.
 */
export function Delta({ from, to, currency = "USD" }: { from: number; to: number; currency?: string }) {
  const diff = to - from;
  const pct = from > 0 ? (diff / from) * 100 : 0;
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency });

  if (diff === 0) {
    return <span className="text-sm text-ink-faint">No change since added</span>;
  }

  const isDrop = diff < 0;
  return (
    <span className={`text-sm font-medium ${isDrop ? "text-brand" : "text-ink-muted"}`}>
      {isDrop ? "▼" : "▲"} {fmt.format(Math.abs(diff))} ({Math.abs(pct).toFixed(1)}%)
    </span>
  );
}
