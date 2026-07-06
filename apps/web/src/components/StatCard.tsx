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
    <div className="flex items-center gap-2.5 rounded-lg border border-border/10 bg-surface px-3.5 py-3">
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
          accent ? "bg-brand/15 text-brand" : "bg-surface-raised text-ink-muted"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="tabular text-lg font-semibold leading-none text-ink">{value}</div>
        <div className="mt-1 truncate text-[11px] leading-none text-ink-faint">{label}</div>
      </div>
    </div>
  );
}
