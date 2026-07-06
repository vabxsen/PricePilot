import type { ReactNode } from "react";

/**
 * Premium dashboard metric tile — tinted icon chip + big tabular value.
 * `accent` promotes the icon chip to the brand color for the headline stat.
 */
export function StatCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/10 bg-surface p-4 transition hover:border-border/20 hover:bg-surface-raised">
      <div
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${
          accent ? "bg-brand/15 text-brand" : "bg-surface-raised text-ink-muted"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="tabular text-2xl font-semibold leading-none text-ink">{value}</div>
        <div className="mt-1 truncate text-xs text-ink-faint">{label}</div>
      </div>
    </div>
  );
}
