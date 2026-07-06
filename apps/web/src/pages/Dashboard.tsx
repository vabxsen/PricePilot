import { Link } from "react-router-dom";
import { StatCard } from "../components/StatCard.js";
import { buttonClasses } from "../components/ui/Button.js";
import {
  IconBell,
  IconBox,
  IconChevronRight,
  IconPlus,
  IconSettings,
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

function DropRow({ item }: { item: TrackedItem }) {
  const { tracker, product } = item;
  if (!product || product.currentPrice === null) return null;
  return (
    <Link
      to={`/product/${product.id}`}
      className="flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-surface-raised"
    >
      {product.imageUrl ? (
        <img src={product.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-surface-raised text-ink-faint">
          <IconBox size={18} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{product.title}</div>
        <div className="tabular text-xs text-ink-faint">
          <span className="line-through">{formatMoney(tracker.priceAtAdd, product.currency)}</span>{" "}
          <span className="text-ink-muted">→ {formatMoney(product.currentPrice, product.currency)}</span>
        </div>
      </div>
      <div className="tabular shrink-0 text-sm font-semibold text-brand">
        −{formatMoney(tracker.priceAtAdd - product.currentPrice, product.currency)}
      </div>
    </Link>
  );
}

function TargetRow({ item }: { item: TrackedItem }) {
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
      className="block rounded-md px-2 py-2 transition hover:bg-surface-raised"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="truncate text-sm font-medium text-ink">{product.title}</div>
        <div className="tabular shrink-0 text-xs text-ink-faint">
          {formatMoney(product.currentPrice, product.currency)} /{" "}
          <span className="text-brand">{formatMoney(tracker.targetPrice, product.currency)}</span>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-1 text-xs text-ink-faint">
        {met
          ? "Target reached 🎉"
          : `${formatMoney(product.currentPrice - tracker.targetPrice, product.currency)} to go`}
      </div>
    </Link>
  );
}

const quickActions = [
  { to: "/add", label: "Track a product", desc: "Paste any product URL", icon: IconPlus, accent: true },
  { to: "/products", label: "Browse products", desc: "Manage your watchlist", icon: IconTag },
  { to: "/settings", label: "Account settings", desc: "Profile & preferences", icon: IconSettings },
];

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Welcome back, {name}</h1>
          <p className="mt-1 text-sm text-ink-muted">Here's what's happening with your watchlist.</p>
        </div>
        <Link
          to="/add"
          className={`${buttonClasses("primary", "md")} hidden items-center gap-2 md:inline-flex`}
        >
          <IconPlus size={18} /> Track a product
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<IconBox size={20} />} label="Products tracked" value={items.length} accent />
        <StatCard icon={<IconTrendDown size={20} />} label="Price drops" value={drops.length} />
        <StatCard icon={<IconBell size={20} />} label="Active alerts" value={activeAlerts.length} />
        <StatCard icon={<IconTarget size={20} />} label="Targets met" value={targetsMet.length} />
      </div>

      {loading && items.length === 0 && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="h-40 animate-pulse rounded-lg border border-border/10 bg-surface" />
          <div className="h-40 animate-pulse rounded-lg border border-border/10 bg-surface" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-border/15 bg-surface/40 p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-brand">
            <IconTag size={22} />
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
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Recent price drops */}
          <div className="rounded-lg border border-border/10 bg-surface p-4">
            <SectionHeader title="Recent price drops" to="/products" cta="All products" />
            {drops.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-ink-faint">
                No drops yet — we'll flag them here the moment prices fall.
              </p>
            ) : (
              <div className="-mx-2">
                {drops.slice(0, 5).map((item) => (
                  <DropRow key={item.tracker.id} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Active price targets */}
          <div className="rounded-lg border border-border/10 bg-surface p-4">
            <SectionHeader title="Active alerts" />
            {targets.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-ink-faint">
                No price targets set. Add a target when tracking a product to see progress here.
              </p>
            ) : (
              <div className="-mx-2">
                {targets.slice(0, 5).map((item) => (
                  <TargetRow key={item.tracker.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-8">
        <SectionHeader title="Quick actions" />
        <div className="grid gap-3 sm:grid-cols-3">
          {quickActions.map(({ to, label, desc, icon: Icon, accent }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center gap-3 rounded-lg border border-border/10 bg-surface p-4 transition hover:border-brand/40 hover:bg-surface-raised"
            >
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${
                  accent ? "bg-brand/15 text-brand" : "bg-surface-raised text-ink-muted"
                }`}
              >
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{label}</div>
                <div className="truncate text-xs text-ink-faint">{desc}</div>
              </div>
              <IconChevronRight
                size={16}
                className="shrink-0 text-ink-faint transition group-hover:text-brand"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
