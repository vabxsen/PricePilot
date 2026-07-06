export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/5 bg-surface p-4 dark:border-white/10">
      <div className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">{label}</div>
      <div className="tabular mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
