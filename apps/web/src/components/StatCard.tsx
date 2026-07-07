import type { ReactNode } from "react";

export type StatTone = "brand" | "warning" | "muted";

const toneClasses: Record<StatTone, string> = {
  brand: "bg-brand/15 text-brand",
  warning: "bg-warning/15 text-warning",
  muted: "bg-surface-raised text-ink-muted",
};

/**
 * Premium dashboard metric tile — tinted icon chip, big tabular value, and
 * an optional `meta` line for real derived context (a ratio, an average
 * discount, etc.) rather than an invented trend arrow we can't back with
 * actual time-series data on the Spark-tier schema.
 */
export function StatCard({
  icon,
  label,
  value,
  meta,
  tone = "muted",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  tone?: StatTone;
}) {
  return (
    <div className="group rounded-lg border border-border/10 bg-surface p-2.5 transition duration-200 hover:border-border/20 hover:bg-surface-raised/60">
      <div className="flex items-center justify-between">
        <div
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-105 ${toneClasses[tone]}`}
        >
          {icon}
        </div>
        {meta && (
          <span className="tabular text-[11px] font-medium text-ink-faint">{meta}</span>
        )}
      </div>
      <div className="tabular mt-2 text-xl font-semibold leading-none tracking-tight text-ink">
        {value}
      </div>
      <div className="mt-1 truncate text-xs leading-none text-ink-faint">{label}</div>
    </div>
  );
}
