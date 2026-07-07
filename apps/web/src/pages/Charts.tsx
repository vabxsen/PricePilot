import {
  computeStats,
  type PricePoint,
  type ProductDoc,
  type TrackerDoc,
} from "@pricepilot/shared";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PriceHistoryChart } from "../components/PriceHistoryChart.js";
import { RetailerBadge } from "../components/RetailerBadge.js";
import { buttonClasses } from "../components/ui/Button.js";
import { SegmentedControl, type Segment } from "../components/ui/SegmentedControl.js";
import {
  IconBox,
  IconChart,
  IconCheck,
  IconChevronDown,
  IconExternal,
  IconPlus,
  IconTrendDown,
} from "../components/ui/icons.js";
import { useAuth } from "../lib/auth.js";
import { formatMoney } from "../lib/format.js";
import { useProductHistory, useTrackedProducts, type TrackedItem } from "../lib/trackers.js";

type RangeKey = "1W" | "1M" | "3M" | "6M" | "1Y" | "All";

const RANGE_DAYS: Record<RangeKey, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  All: Number.POSITIVE_INFINITY,
};

const RANGE_OPTIONS: Segment<RangeKey>[] = (Object.keys(RANGE_DAYS) as RangeKey[]).map((k) => ({
  value: k,
  label: k,
}));

interface DropEvent {
  ts: number;
  from: number;
  to: number;
  pct: number;
}

/**
 * Real Firebase history is only recorded by the scraper, and only when a
 * price *changes* — so a freshly-tracked (or stable-priced) product has no
 * points to plot yet. Bracket the real series with what we already know for
 * certain: the price when the user started tracking (`priceAtAdd` at the
 * tracker's `createdAt`) and the latest known price (`currentPrice`). This
 * seeds the chart with real, owned data immediately and blends seamlessly
 * as the scraper records genuine changes over time. Purely presentational —
 * nothing is written to Firestore (history stays Admin-SDK-only).
 */
function seedSeries(
  history: PricePoint[],
  tracker: TrackerDoc | null,
  product: ProductDoc | null,
): PricePoint[] {
  const points: PricePoint[] = [...history];

  if (tracker && tracker.priceAtAdd > 0) {
    const first = points[0];
    if (!first || tracker.createdAt < first.ts) {
      points.unshift({
        ts: tracker.createdAt,
        price: tracker.priceAtAdd,
        inStock: true,
        source: "manual",
      });
    }
  }

  if (product && product.currentPrice != null) {
    const last = points[points.length - 1];
    const nowTs = product.lastCheckedAt ?? Date.now();
    // Append the current price when it differs from the last point, or extend
    // a flat line to "now" when it's unchanged — either way avoids a lonely
    // single dot for a just-tracked product.
    if (!last || last.price !== product.currentPrice || nowTs > last.ts) {
      points.push({
        ts: Math.max(nowTs, (last?.ts ?? 0) + 1),
        price: product.currentPrice,
        inStock: product.inStock,
        source: "manual",
      });
    }
  }

  return points;
}

/** Consecutive points where the price fell, most recent first. */
function dropEvents(history: PricePoint[]): DropEvent[] {
  const events: DropEvent[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1]!;
    const curr = history[i]!;
    if (curr.price < prev.price && prev.price > 0) {
      events.push({
        ts: curr.ts,
        from: prev.price,
        to: curr.price,
        pct: Math.round(((prev.price - curr.price) / prev.price) * 100),
      });
    }
  }
  return events.reverse();
}

function Stat({
  label,
  value,
  valueClass = "text-ink",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`tabular mt-1 text-base font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}

function Thumb({ url, size = 24 }: { url?: string; size?: number }) {
  const cls = size === 24 ? "h-6 w-6" : "h-7 w-7";
  return url ? (
    <img src={url} alt="" className={`${cls} shrink-0 rounded-md object-cover`} />
  ) : (
    <span className={`grid ${cls} shrink-0 place-items-center rounded-md bg-surface-raised text-ink-faint`}>
      <IconBox size={size === 24 ? 13 : 15} />
    </span>
  );
}

/** Compact dropdown to pick which tracked product to chart. */
function ProductPicker({
  items,
  selectedId,
  onSelect,
}: {
  items: TrackedItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const products = items.map((i) => i.product).filter(Boolean) as NonNullable<TrackedItem["product"]>[];
  const selected = products.find((p) => p.id === selectedId) ?? null;

  return (
    <div ref={ref} className="relative mt-5 max-w-[15rem]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl border border-border/15 bg-surface px-3 py-2.5 text-left transition hover:bg-surface-raised"
      >
        <Thumb url={selected?.imageUrl} size={28} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
          {selected?.title ?? "Select a product"}
        </span>
        <IconChevronDown
          size={18}
          className={`shrink-0 text-ink-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-border/10 bg-surface-raised p-1 shadow-lg"
        >
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={p.id === selectedId}
              onClick={() => {
                onSelect(p.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                p.id === selectedId ? "bg-brand/10 text-brand" : "text-ink hover:bg-surface"
              }`}
            >
              <Thumb url={p.imageUrl} />
              <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
              {p.id === selectedId && <IconCheck size={15} className="shrink-0 text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Charts() {
  const { user } = useAuth();
  const { items, loading } = useTrackedProducts(user?.uid);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("All");

  // Default to the first tracked product; recover if the selection disappears.
  useEffect(() => {
    const ids = items.map((i) => i.product?.id).filter(Boolean) as string[];
    if (ids.length === 0) {
      if (selectedId !== null) setSelectedId(null);
    } else if (!selectedId || !ids.includes(selectedId)) {
      setSelectedId(ids[0]!);
    }
  }, [items, selectedId]);

  const selected = items.find((i) => i.product?.id === selectedId);
  const selectedProduct = selected?.product ?? null;
  const selectedTracker = selected?.tracker ?? null;
  const { history } = useProductHistory(selectedId ?? undefined);

  const view = (() => {
    const series = seedSeries(history, selectedTracker, selectedProduct);
    const days = RANGE_DAYS[range];
    const cutoff = Number.isFinite(days) ? Date.now() - days * 86_400_000 : -Infinity;
    const filtered = series.filter((h) => h.ts >= cutoff);
    const stats = computeStats(filtered);
    const first = filtered[0];
    const last = filtered[filtered.length - 1];
    const changePct =
      first && last && first.price > 0 ? ((last.price - first.price) / first.price) * 100 : 0;
    return { filtered, stats, changePct, events: dropEvents(filtered) };
  })();

  if (loading && items.length === 0) {
    return (
      <section className="animate-fade-up">
        <h1 className="text-2xl font-bold text-ink">Charts</h1>
        <div className="mt-6 h-72 animate-pulse rounded-xl border border-border/10 bg-surface" />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="animate-fade-up">
        <h1 className="text-2xl font-bold text-ink">Charts</h1>
        <div className="mt-6 rounded-xl border border-dashed border-border/15 bg-surface/40 p-10 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-brand/15 text-brand">
            <IconChart size={20} />
          </div>
          <p className="mt-4 font-medium text-ink">No products to chart yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Track a product and its price history will appear here over time.
          </p>
          <Link
            to="/add"
            className={`${buttonClasses("primary", "md")} mt-5 inline-flex items-center gap-2`}
          >
            <IconPlus size={18} /> Track a product
          </Link>
        </div>
      </section>
    );
  }

  const product = selected?.product ?? null;
  const tracker = selected?.tracker ?? null;
  const currency = product?.currency ?? "USD";
  const currentPrice = product?.currentPrice ?? view.stats?.latest ?? null;
  const changeIsDrop = view.changePct < 0;

  return (
    <section className="animate-fade-up">
      <h1 className="text-2xl font-bold text-ink">Charts</h1>
      <p className="mt-1 text-sm text-ink-muted">Price history for any product you track.</p>

      {/* Product selector — compact dropdown; scales cleanly to many products. */}
      <ProductPicker items={items} selectedId={selectedId} onSelect={setSelectedId} />

      {product && (
        <>
          {/* Header */}
          <div className="mt-4 rounded-xl border border-border/10 bg-surface p-4">
            <div className="flex items-start gap-3.5">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-surface-raised text-ink-faint">
                  <IconBox size={22} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-1.5"
                >
                  <span className="font-semibold text-ink group-hover:text-brand">
                    {product.title}
                  </span>
                  <IconExternal size={13} className="mt-1 shrink-0 text-ink-faint" />
                </a>
                <div className="mt-1.5">
                  <RetailerBadge retailer={product.retailer} url={product.url} />
                </div>
              </div>
            </div>

            <div className="mt-3.5 flex items-center gap-2.5 border-t border-border/10 pt-3.5">
              <span className="tabular text-2xl font-semibold text-ink">
                {currentPrice !== null ? formatMoney(currentPrice, currency) : "—"}
              </span>
              {view.stats && (
                <span
                  className={`tabular inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                    view.changePct === 0
                      ? "bg-surface-raised text-ink-muted"
                      : changeIsDrop
                        ? "bg-brand/15 text-brand"
                        : "bg-surface-raised text-ink-muted"
                  }`}
                >
                  {view.changePct !== 0 && (changeIsDrop ? "▼" : "▲")}
                  {view.changePct > 0 ? "+" : ""}
                  {view.changePct.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Range selector */}
          <div className="mt-4">
            <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />
          </div>

          {/* Chart */}
          <div className="mt-3">
            <PriceHistoryChart
              history={view.filtered}
              currency={currency}
              targetPrice={tracker?.targetPrice}
            />
          </div>

          {/* Stats — grouped into one clean card */}
          <div className="mt-4 grid grid-cols-3 divide-x divide-border/10 rounded-xl border border-border/10 bg-surface">
            <Stat
              label="Lowest"
              value={view.stats ? formatMoney(view.stats.min, currency) : "—"}
              valueClass="text-brand"
            />
            <Stat label="Average" value={view.stats ? formatMoney(view.stats.avg, currency) : "—"} />
            <Stat label="Highest" value={view.stats ? formatMoney(view.stats.max, currency) : "—"} />
          </div>

          {tracker?.targetPrice != null && (
            <p className="tabular mt-3 text-center text-xs text-ink-muted">
              Target price{" "}
              <span className="text-brand">{formatMoney(tracker.targetPrice, currency)}</span>
            </p>
          )}

          {/* Price drop timeline */}
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
              Price drops
            </h2>
            {view.events.length === 0 ? (
              <p className="rounded-xl border border-border/10 bg-surface px-4 py-6 text-center text-sm text-ink-faint">
                No price drops recorded in this range yet.
              </p>
            ) : (
              <ol className="space-y-2">
                {view.events.slice(0, 20).map((e) => (
                  <li
                    key={e.ts}
                    className="flex items-center gap-3 rounded-xl border border-border/10 bg-surface px-3 py-2.5"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
                      <IconTrendDown size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink">Dropped {e.pct}%</div>
                      <div className="text-xs text-ink-faint">
                        {new Date(e.ts).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="tabular shrink-0 text-right">
                      <div className="text-sm font-semibold text-ink">
                        {formatMoney(e.to, currency)}
                      </div>
                      <div className="text-xs text-ink-faint line-through">
                        {formatMoney(e.from, currency)}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
    </section>
  );
}
