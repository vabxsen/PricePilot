import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ProductListItem } from "../components/ProductListItem.js";
import { buttonClasses } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { SegmentedControl, type Segment } from "../components/ui/SegmentedControl.js";
import { IconPlus, IconSearch, IconTag } from "../components/ui/icons.js";
import { useAuth } from "../lib/auth.js";
import {
  removeTracker,
  setTrackerAlertsEnabled,
  useTrackedProducts,
  type TrackedItem,
} from "../lib/trackers.js";

type Filter = "all" | "drops" | "alerts" | "targets";

function matchesFilter(item: TrackedItem, filter: Filter): boolean {
  const { tracker, product } = item;
  switch (filter) {
    case "drops":
      return (
        !!product &&
        product.currentPrice !== null &&
        tracker.priceAtAdd > 0 &&
        product.currentPrice < tracker.priceAtAdd
      );
    case "alerts":
      return tracker.alertsEnabled;
    case "targets":
      return (
        tracker.targetPrice != null &&
        !!product &&
        product.currentPrice !== null &&
        product.currentPrice <= tracker.targetPrice
      );
    default:
      return true;
  }
}

export function Products() {
  const { user } = useAuth();
  const { items, loading } = useTrackedProducts(user?.uid);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      all: items.length,
      drops: items.filter((i) => matchesFilter(i, "drops")).length,
      alerts: items.filter((i) => matchesFilter(i, "alerts")).length,
      targets: items.filter((i) => matchesFilter(i, "targets")).length,
    }),
    [items],
  );

  const filterOptions: Segment<Filter>[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "drops", label: "Price drops", count: counts.drops },
    { value: "alerts", label: "Alerts on", count: counts.alerts },
    { value: "targets", label: "Target met", count: counts.targets },
  ];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesFilter(item, filter)) return false;
      if (!q) return true;
      const p = item.product;
      return (
        !!p &&
        (p.title.toLowerCase().includes(q) ||
          p.retailer.toLowerCase().includes(q) ||
          (p.brand ?? "").toLowerCase().includes(q))
      );
    });
  }, [items, filter, search]);

  async function handleToggle(item: TrackedItem, value: boolean) {
    if (!user) return;
    await setTrackerAlertsEnabled(user.uid, item.tracker.id, value);
  }

  async function handleRemove(item: TrackedItem) {
    if (!user) return;
    const title = item.product?.title ?? "this product";
    if (!window.confirm(`Stop tracking ${title}?`)) return;
    await removeTracker(user.uid, item.tracker.id, item.tracker.productId);
  }

  return (
    <section className="animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Products</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {items.length} {items.length === 1 ? "product" : "products"} tracked
          </p>
        </div>
        <Link
          to="/add"
          className={`${buttonClasses("primary", "md")} hidden items-center gap-2 md:inline-flex`}
        >
          <IconPlus size={18} /> Track a product
        </Link>
      </div>

      {/* Search */}
      <div className="relative mt-6">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
          <IconSearch size={18} />
        </span>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products or retailers…"
          className="pl-10"
          aria-label="Search products"
        />
      </div>

      {/* Filters */}
      <div className="mt-3">
        <SegmentedControl options={filterOptions} value={filter} onChange={setFilter} />
      </div>

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border border-border/10 bg-surface" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border/15 bg-surface/40 p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-brand">
            <IconTag size={22} />
          </div>
          <p className="mt-4 font-medium text-ink">No products yet</p>
          <p className="mt-1 text-sm text-ink-muted">Track your first product to see it here.</p>
          <Link
            to="/add"
            className={`${buttonClasses("primary", "md")} mt-5 inline-flex items-center gap-2`}
          >
            <IconPlus size={18} /> Track a product
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-faint">
          No products match your search or filter.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visible.map((item) => (
            <ProductListItem
              key={item.tracker.id}
              tracker={item.tracker}
              product={item.product}
              onToggleAlerts={(value) => handleToggle(item, value)}
              onRemove={() => handleRemove(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
