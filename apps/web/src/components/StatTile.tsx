export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/10 bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="tabular mt-1 text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}
