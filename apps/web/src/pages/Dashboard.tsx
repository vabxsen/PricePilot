import { Link } from "react-router-dom";
import { StatCard } from "../components/StatCard.js";
import { buttonClasses } from "../components/ui/Button.js";
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
import { useTrackedProducts, type TrackedItem } from "../lib/trackers.js";

function SectionHeader({ title, to, cta }: { title: string; to?: string; cta?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">{title}</h2>
      {to && (
        <Link to={to} className="flex items-center gap-1 text-sm text-brand transition hover:opacity-80">
          {cta ?? "View all"} <IconChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

/** Simplified summary row: image, title, current price, and a compact drop-percent badge. */
function DropRow({ item }: { item: TrackedItem }) {
  const { tracker, product } = item;
  if (!product || product.currentPrice === null || tracker.priceAtAdd <= 0) return null;

  const pct = Math.round(((tracker.priceAtAdd - product.currentPrice) / tracker.priceAtAdd) * 100);

  return (
    <Link
      to={`/product/${product.id}`}
      className="flex items-center gap-3 rounded-md px-2.5 py-2.5 transition hover:bg-surface-raised"
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
        <div className="tabular mt-0.5 text-sm font-semibold text-ink">
          {formatMoney(product.currentPrice, product.currency)}
        </div>
      </div>
      <span className="tabular shrink-0 rounded-full bg-brand/15 px-2 py-1 text-xs font-semibold text-brand">
        −{pct}%
      </span>
    </Link>
  );
}

/** Active alerts as compact product cards: image, current/target price, and a progress bar. */
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
      className="flex gap-3 rounded-lg border border-border/10 bg-surface-raised p-3 transition hover:border-brand/30"
    >
      {product.imageUrl ? (
        <img src={product.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-surface text-ink-faint">
          <IconBox size={16} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{product.title}</div>
        <div className="tabular mt-0.5 flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-ink">{formatMoney(product.currentPrice, product.currency)}</span>
          <span className="text-ink-faint">/</span>
          <span className="text-brand">{formatMoney(tracker.targetPrice, product.currency)}</span>
          {met && (
            <span className="ml-auto rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-medium text-brand">
              Reached
            </span>
          )}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </Link>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { items, loading } = useTrackedProducts(user?.uid);

  const name = (
    profile?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "there"
  ).trim();

  const drops = items
    .filter(
      (i) =>
        i.product &&
        i.product.currentPrice !== null &&
        i.tracker.priceAtAdd > 0 &&
        i.product.currentPrice < i.tracker.priceAtAdd,
    )
    .sort((a, b) => {
      const da = (a.tracker.priceAtAdd - a.product!.currentPrice!) / a.tracker.priceAtAdd;
      const db = (b.tracker.priceAtAdd - b.product!.currentPrice!) / b.tracker.priceAtAdd;
      return db - da;
    });

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

  return (
    <section className="animate-fade-up">
      <h1 className="text-2xl font-bold text-ink">Welcome back, {name}</h1>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard icon={<IconBox size={16} />} label="Tracked" value={items.length} accent />
        <StatCard icon={<IconTrendDown size={16} />} label="Price drops" value={drops.length} />
        <StatCard icon={<IconBell size={16} />} label="Alerts" value={activeAlerts.length} />
        <StatCard icon={<IconTarget size={16} />} label="Targets met" value={targetsMet.length} />
      </div>

      {loading && items.length === 0 && (
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="h-16 animate-pulse rounded-lg border border-border/10 bg-surface" />
          <div className="h-16 animate-pulse rounded-lg border border-border/10 bg-surface" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="mt-10 rounded-lg border border-dashed border-border/15 bg-surface/40 p-10 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-brand/15 text-brand">
            <IconTag size={20} />
          </div>
          <p className="mt-4 font-medium text-ink">You're not tracking anything yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Add your first product and we'll watch the price for you.
          </p>
          <Link
            to="/add"
            className={`${buttonClasses("primary", "md")} mt-5 inline-flex items-center gap-2`}
          >
            <IconPlus size={18} /> Track your first product
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <>
          {/* Track a product — now where Recent price drops used to sit */}
          <div className="mt-10 flex">
            <Link
              to="/add"
              className={`${buttonClasses("primary", "md")} inline-flex w-full items-center justify-center gap-2 sm:w-auto`}
            >
              <IconPlus size={18} /> Track a product
            </Link>
          </div>

          {/* Active price targets */}
          <div className="mt-5 rounded-lg border border-border/10 bg-surface p-4">
            <SectionHeader title="Active alerts" />
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

          {/* Recent price drops — moved to the bottom */}
          <div className="mt-5 rounded-lg border border-border/10 bg-surface p-4">
            <SectionHeader title="Recent price drops" to="/products" cta="All products" />
            {drops.length === 0 ? (
              <p className="px-2 py-5 text-center text-sm text-ink-faint">
                No drops yet — check back soon.
              </p>
            ) : (
              <div className="-mx-2">
                {drops.slice(0, 5).map((item) => (
                  <DropRow key={item.tracker.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
