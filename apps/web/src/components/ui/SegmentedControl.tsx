/**
 * Horizontal pill filter. Scrolls horizontally on narrow screens without a
 * visible scrollbar (`.no-scrollbar`, defined in index.css).
 */
export interface Segment<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              active
                ? "border-brand/40 bg-brand/10 text-brand"
                : "border-border/15 bg-surface text-ink-muted hover:bg-surface-raised hover:text-ink"
            }`}
          >
            {opt.label}
            {opt.count != null && (
              <span
                className={`tabular rounded-full px-1.5 text-xs ${
                  active ? "bg-brand/20 text-brand" : "bg-surface-raised text-ink-faint"
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
