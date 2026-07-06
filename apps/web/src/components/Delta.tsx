export function Delta({ from, to, currency = "USD" }: { from: number; to: number; currency?: string }) {
  const diff = to - from;
  const pct = from > 0 ? (diff / from) * 100 : 0;
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency });

  if (diff === 0) {
    return <span className="text-sm text-black/40 dark:text-white/40">No change since added</span>;
  }

  const isDrop = diff < 0;
  return (
    <span className={`text-sm font-medium ${isDrop ? "text-success" : "text-danger"}`}>
      {isDrop ? "▼" : "▲"} {fmt.format(Math.abs(diff))} ({Math.abs(pct).toFixed(1)}%)
    </span>
  );
}
