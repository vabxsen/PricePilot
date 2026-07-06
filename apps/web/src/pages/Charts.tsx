import {
  computeStats,
  type PricePoint,
  type ProductDoc,
  type TrackerDoc,
} from "@pricepilot/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PriceHistoryChart } from "../components/PriceHistoryChart.js";
import { buttonClasses } from "../components/ui/Button.js";
import { SegmentedControl, type Segment } from "../components/ui/SegmentedControl.js";
import { IconBox, IconChart, IconExternal, IconPlus, IconTrendDown } from "../components/ui/icons.js";
import { useAuth } from "../lib/auth.js";
import { formatMoney } from "../lib/format.js";
import { useProductHistory, useTrackedProducts } from "../lib/trackers.js";

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
    <div className="rounded-lg border border-border/10 bg-surface p-3">
      <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`tabular mt-1 text-lg font-semibold ${valueClass}`}>{value}</div>
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
        <div className="mt-6 h-72 animate-pulse rounded-lg border border-border/10 bg-surface" />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="animate-fade-up">
        <h1 className="text-2xl font-bold text-ink">Charts</h1>
        <div className="mt-6 rounded-lg border border-dashed border-border/15 bg-surface/40 p-10 text-center">
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

      {/* Product selector */}
      <div className="no-scrollbar -mx-1 mt-5 flex gap-2 overflow-x-auto px-1 py-1">
        {items.map(({ product: p }) =>
          p ? (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition ${
                p.id === selectedId
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-border/15 bg-surface text-ink-muted hover:bg-surface-raised hover:text-ink"
              }`}
            >
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-raised text-ink-faint">
                  <IconBox size={13} />
                </span>
              )}
              <span className="max-w-[10rem] truncate">{p.title}</span>
            </button>
          ) : null,
        )}
      </div>

      {product && (
        <>
          {/* Header */}
          <div className="mt-4 flex gap-4 rounded-lg border border-border/10 bg-surface p-4">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt=""
                className="h-20 w-20 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-surface-raised text-ink-faint">
                <IconBox size={24} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-start gap-1.5"
              >
                <span className="line-clamp-2 font-semibold text-ink group-hover:text-brand">
                  {product.title}
                </span>
                <IconExternal size={14} className="mt-1 shrink-0 text-ink-faint" />
              </a>
              <div className="mt-0.5 text-xs text-ink-faint">{product.retailer}</div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="tabular text-2xl font-semibold text-ink">
                  {currentPrice !== null ? formatMoney(currentPrice, currency) : "—"}
                </span>
                {tracker?.targetPrice != null && (
                  <span className="tabular text-sm text-ink-muted">
                    Target <span className="text-brand">{formatMoney(tracker.targetPrice, currency)}</span>
                  </span>
                )}
              </div>
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

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <Stat
              label="Lowest"
              value={view.stats ? formatMoney(view.stats.min, currency) : "—"}
              valueClass="text-brand"
            />
            <Stat label="Highest" value={view.stats ? formatMoney(view.stats.max, currency) : "—"} />
            <Stat
              label="Current"
              value={currentPrice !== null ? formatMoney(currentPrice, currency) : "—"}
            />
            <Stat label="Average" value={view.stats ? formatMoney(view.stats.avg, currency) : "—"} />
            <Stat
              label="Change"
              value={`${view.changePct > 0 ? "+" : ""}${view.changePct.toFixed(1)}%`}
              valueClass={
                view.changePct === 0 ? "text-ink-muted" : changeIsDrop ? "text-brand" : "text-ink-muted"
              }
            />
          </div>

          {/* Price drop timeline */}
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
              Price drop events
            </h2>
            {view.events.length === 0 ? (
              <p className="rounded-lg border border-border/10 bg-surface px-4 py-6 text-center text-sm text-ink-faint">
                No price drops recorded in this range yet.
              </p>
            ) : (
              <ol className="space-y-2">
                {view.events.slice(0, 20).map((e) => (
                  <li
                    key={e.ts}
                    className="flex items-center gap-3 rounded-lg border border-border/10 bg-surface px-3 py-2.5"
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
