import { useState } from "react";
import { Link } from "react-router-dom";
import { RetailerBadge } from "../components/RetailerBadge.js";
import { Sparkline } from "../components/Sparkline.js";
import { StatCard } from "../components/StatCard.js";
import { TrackProductDialog } from "../components/TrackProductDialog.js";
import {
  IconBell,
  IconBox,
  IconChevronRight,
  IconPlus,
  IconTag,
  IconTarget,
  IconTrendDown,
} from "../components/ui/icons.js";
import { useAuth } from "../lib/auth.js";
import { formatMoney } from "../lib/format.js";
import { useUserProfile } from "../lib/profile.js";
import { useProductHistory, useTrackedProducts, type TrackedItem } from "../lib/trackers.js";

function SectionHeader({ title, to, cta }: { title: string; to?: string; cta?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">{title}</h2>
      {to && (
        <Link
          to={to}
          className="flex items-center gap-1 text-sm font-medium text-brand transition hover:opacity-80"
        >
          {cta ?? "View all"} <IconChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

/** Real, derived-from-data discount percent — never invented. */
function dropPercent(item: TrackedItem): number | null {
  const { tracker, product } = item;
  if (!product || product.currentPrice === null || tracker.priceAtAdd <= 0) return null;
  if (product.currentPrice >= tracker.priceAtAdd) return null;
  return Math.round(((tracker.priceAtAdd - product.currentPrice) / tracker.priceAtAdd) * 100);
}

/** Premium "track a product" CTA — shared between the empty state and the main dashboard. */
function TrackButton({
  onClick,
  label,
  fullWidth = false,
}: {
  onClick: () => void;
  label: string;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center justify-center gap-2.5 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-bg transition duration-200 hover:bg-brand-hover active:scale-[0.99] ${
        fullWidth ? "w-full" : "w-full sm:w-auto"
      }`}
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-bg/15 transition-transform duration-200 group-hover:rotate-90">
        <IconPlus size={13} />
      </span>
      {label}
    </button>
  );
}

/** Simplified summary row: image, title, current price, and a compact drop-percent badge. */
function DropRow({ item }: { item: TrackedItem }) {
  const { product } = item;
  const pct = dropPercent(item);
  if (!product || pct === null) return null;

  return (
    <Link
      to={`/product/${product.id}`}
      className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition duration-200 hover:bg-surface-raised"
    >
      {product.imageUrl ? (
        <img src={product.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-surface-raised text-ink-faint">
          <IconBox size={16} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{product.title}</div>
        <div className="mt-0.5 flex items-center gap-2">
          <RetailerBadge retailer={product.retailer} url={product.url} />
          <span className="tabular text-sm font-semibold text-ink">
            {formatMoney(product.currentPrice!, product.currency)}
          </span>
        </div>
      </div>
      <span className="tabular shrink-0 rounded-full bg-brand/15 px-2 py-1 text-xs font-semibold text-brand">
        −{pct}%
      </span>
    </Link>
  );
}

/** Active alerts as compact cards: separate Current/Target rows + a thin progress bar. */
function TargetCard({ item }: { item: TrackedItem }) {
  const { tracker, product } = item;
  if (!product || product.currentPrice === null || tracker.targetPrice == null) return null;

  const met = product.currentPrice <= tracker.targetPrice;
  const start = Math.max(tracker.priceAtAdd, tracker.targetPrice + 0.01);
  const progress = met
    ? 100
    : Math.max(
        0,
        Math.min(100, ((start - product.currentPrice) / (start - tracker.targetPrice)) * 100),
      );

  return (
    <Link
      to={`/product/${product.id}`}
      className="flex gap-3 rounded-xl border border-border/10 bg-surface-raised p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-brand/30"
    >
      {product.imageUrl ? (
        <img src={product.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface text-ink-faint">
          <IconBox size={16} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-ink">{product.title}</div>
            <div className="mt-0.5">
              <RetailerBadge retailer={product.retailer} url={product.url} />
            </div>
          </div>
          {met && (
            <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-medium text-brand">
              Reached
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-5">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
              Current
            </div>
            <div className="tabular text-sm font-semibold text-ink">
              {formatMoney(product.currentPrice, product.currency)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
              Target
            </div>
            <div className="tabular text-sm font-semibold text-brand">
              {formatMoney(tracker.targetPrice, product.currency)}
            </div>
          </div>
        </div>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

/** Compact horizontal deal card for the "Deals today" carousel. */
function DealCard({ item }: { item: TrackedItem }) {
  const { product } = item;
  const pct = dropPercent(item);
  if (!product || pct === null) return null;

  return (
    <Link
      to={`/product/${product.id}`}
      className="flex w-36 shrink-0 flex-col gap-2 rounded-xl border border-border/10 bg-surface p-3 transition duration-200 hover:-translate-y-0.5 hover:border-brand/30 sm:w-40"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface-raised">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-ink-faint">
            <IconBox size={20} />
          </div>
        )}
        <span className="tabular absolute left-1.5 top-1.5 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-bg">
          −{pct}%
        </span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-ink">{product.title}</div>
        <div className="tabular mt-0.5 text-sm font-semibold text-ink">
          {formatMoney(product.currentPrice!, product.currency)}
        </div>
      </div>
    </Link>
  );
}

function DealsToday({ drops }: { drops: TrackedItem[] }) {
  if (drops.length === 0) return null;
  return (
    <div className="mt-5">
      <SectionHeader title="Deals today" />
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {drops.slice(0, 10).map((item) => (
          <DealCard key={item.tracker.id} item={item} />
        ))}
      </div>
    </div>
  );
}

/** Potential savings + a real 7-day trend for the single biggest current deal. */
function PriceInsights({ drops }: { drops: TrackedItem[] }) {
  const topDeal = drops[0];
  const { history } = useProductHistory(topDeal?.product?.id);

  if (drops.length === 0) return null;

  const currency = topDeal?.product?.currency ?? "USD";
  const potentialSavings = drops.reduce((sum, i) => {
    const current = i.product?.currentPrice;
    if (current == null) return sum;
    return sum + Math.max(0, i.tracker.priceAtAdd - current);
  }, 0);

  const weekAgo = Date.now() - 7 * 86_400_000;
  const recent = history.filter((p) => p.ts >= weekAgo);
  const sparkData = (recent.length >= 2 ? recent : history.slice(-14)).map((p) => p.price);
  const topPct = topDeal ? dropPercent(topDeal) : null;

  return (
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/10 bg-surface p-4">
        <div className="min-w-0">
          <div className="text-xs font-medium text-ink-faint">Potential savings</div>
          <div className="tabular mt-1 text-2xl font-bold tracking-tight text-brand">
            {formatMoney(potentialSavings, currency)}
          </div>
          <div className="mt-1 truncate text-[11px] text-ink-faint">
            Across {drops.length} item{drops.length === 1 ? "" : "s"} with price drops
          </div>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
          <IconTrendDown size={20} />
        </div>
      </div>

      <div className="rounded-xl border border-border/10 bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-medium text-ink-faint">Weekly trend</div>
            <div className="truncate text-xs text-ink-muted">{topDeal?.product?.title}</div>
          </div>
          {topPct !== null && (
            <span className="tabular shrink-0 text-xs font-semibold text-brand">−{topPct}%</span>
          )}
        </div>
        <div className="mt-2 h-10 text-brand">
          <Sparkline data={sparkData} width={220} height={40} />
        </div>
      </div>
    </div>
  );
}

/** Polished empty state for "Recent price drops" — no fake data, just a calmer illustration. */
function NoDropsYet() {
  return (
    <div className="flex flex-col items-center gap-3 py-9 text-center">
      <div className="relative grid h-16 w-16 place-items-center">
        <div className="absolute inset-0 animate-pulse rounded-full bg-brand/10" />
        <div className="absolute inset-[6px] rounded-full bg-brand/10" />
        <IconTrendDown size={22} className="relative text-brand" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink">No price drops yet</p>
        <p className="mx-auto mt-1 max-w-[240px] text-xs text-ink-faint">
          We're watching every price around the clock — drops will show up here the moment one hits.
        </p>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { items, loading } = useTrackedProducts(user?.uid);
  const [showTrackDialog, setShowTrackDialog] = useState(false);

  const name = (
    profile?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "there"
  ).trim();

  const drops = items
    .filter((i) => dropPercent(i) !== null)
    .sort((a, b) => (dropPercent(b) ?? 0) - (dropPercent(a) ?? 0));

  const activeAlerts = items.filter((i) => i.tracker.alertsEnabled);
  const targets = items.filter(
    (i) => i.tracker.targetPrice != null && i.tracker.alertsEnabled && i.product?.currentPrice != null,
  );
  const targetsMet = items.filter(
    (i) =>
      i.tracker.targetPrice != null &&
      i.product?.currentPrice != null &&
      i.product.currentPrice <= i.tracker.targetPrice,
  );

  const avgDropPct =
    drops.length > 0
      ? Math.round(drops.reduce((sum, i) => sum + (dropPercent(i) ?? 0), 0) / drops.length)
      : null;

  const trackedValue = items.reduce((sum, i) => sum + (i.product?.currentPrice ?? 0), 0);
  const trackedCurrency = items.find((i) => i.product?.currentPrice != null)?.product?.currency ?? "USD";

  return (
    <section className="animate-fade-up">
      <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        Welcome back, {name}
      </h1>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard
          icon={<IconBox size={16} />}
          label="Tracked"
          value={items.length}
          tone="brand"
          meta={items.length > 0 ? formatMoney(trackedValue, trackedCurrency) : undefined}
        />
        <StatCard
          icon={<IconTrendDown size={16} />}
          label="Price drops"
          value={drops.length}
          tone="brand"
          meta={avgDropPct !== null ? `avg −${avgDropPct}%` : undefined}
        />
        <StatCard
          icon={<IconBell size={16} />}
          label="Alerts"
          value={activeAlerts.length}
          tone="warning"
          meta={items.length > 0 ? `of ${items.length}` : undefined}
        />
        <StatCard
          icon={<IconTarget size={16} />}
          label="Targets met"
          value={targetsMet.length}
          tone="brand"
          meta={targets.length > 0 ? `of ${targets.length}` : undefined}
        />
      </div>

      {loading && items.length === 0 && (
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="h-16 animate-pulse rounded-xl border border-border/10 bg-surface" />
          <div className="h-16 animate-pulse rounded-xl border border-border/10 bg-surface" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-border/15 bg-surface/40 p-10 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-brand/15 text-brand">
            <IconTag size={20} />
          </div>
          <p className="mt-4 font-medium text-ink">You're not tracking anything yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Add your first product and we'll watch the price for you.
          </p>
          <div className="mt-5 flex justify-center">
            <TrackButton onClick={() => setShowTrackDialog(true)} label="Track your first product" />
          </div>
        </div>
      )}

      {items.length > 0 && (
        <>
          <PriceInsights drops={drops} />

          {/* Track a product + recent price drops, side by side */}
          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
            <div className="flex flex-col justify-center rounded-xl border border-border/10 bg-surface p-5 lg:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
                Track a product
              </h2>
              <p className="mt-1.5 text-sm text-ink-muted">
                Paste any product link and we'll watch the price for you — and alert you the
                moment it drops.
              </p>
              <div className="mt-4">
                <TrackButton
                  onClick={() => setShowTrackDialog(true)}
                  label="Track a product"
                  fullWidth
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/10 bg-surface p-4">
              <SectionHeader title="Recent price drops" to="/products" cta="All products" />
              {drops.length === 0 ? (
                <NoDropsYet />
              ) : (
                <div className="-mx-2">
                  {drops.slice(0, 4).map((item) => (
                    <DropRow key={item.tracker.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <DealsToday drops={drops} />

          {/* Active price targets */}
          <div className="mt-5 rounded-xl border border-border/10 bg-surface p-4">
            <SectionHeader title="Active alerts" to="/products" cta="View all" />
            {targets.length === 0 ? (
              <p className="px-2 py-5 text-center text-sm text-ink-faint">
                Set a target price to track progress here.
              </p>
            ) : (
              <div className="space-y-2">
                {targets.slice(0, 5).map((item) => (
                  <TargetCard key={item.tracker.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <TrackProductDialog open={showTrackDialog} onClose={() => setShowTrackDialog(false)} />
    </section>
  );
}
