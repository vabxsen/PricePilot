import { computeStats } from "@pricepilot/shared";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../components/ui/Card.js";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.js";
import { PriceChart } from "../components/PriceChart.js";
import { StatTile } from "../components/StatTile.js";
import { buttonClasses } from "../components/ui/Button.js";
import { Switch } from "../components/ui/Switch.js";
import { useAuth } from "../lib/auth.js";
import {
  removeTracker,
  setTrackerAlertsEnabled,
  useProduct,
  useProductHistory,
  useTrackerList,
} from "../lib/trackers.js";

export function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { product, loading } = useProduct(productId);
  const { history } = useProductHistory(productId);
  const { trackers } = useTrackerList(user?.uid);
  const [confirmingUntrack, setConfirmingUntrack] = useState(false);
  const [untracking, setUntracking] = useState(false);

  const tracker = trackers.find((t) => t.productId === productId);
  const stats = computeStats(history);

  if (loading) return <p className="text-ink-faint">Loading…</p>;
  if (!product) return <p className="text-ink-faint">Product not found.</p>;

  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: product.currency });

  async function handleUntrack() {
    if (!user || !tracker || !product) return;
    setUntracking(true);
    await removeTracker(user.uid, tracker.id, product.id);
    navigate("/dashboard");
  }

  async function handleToggleAlerts(value: boolean) {
    if (!user || !tracker) return;
    await setTrackerAlertsEnabled(user.uid, tracker.id, value);
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          {product.imageUrl && (
            <img src={product.imageUrl} alt="" className="h-24 w-24 rounded-lg object-cover" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-ink">{product.title}</h1>
            <p className="text-ink-faint">{product.retailer}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="tabular text-3xl font-semibold text-ink">
                {product.currentPrice !== null ? fmt.format(product.currentPrice) : "—"}
              </span>
              {product.originalPrice != null && product.originalPrice > (product.currentPrice ?? 0) && (
                <span className="tabular text-base text-ink-faint line-through">
                  {fmt.format(product.originalPrice)}
                </span>
              )}
              {product.discountPercent != null && product.discountPercent > 0 && (
                <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
                  {product.discountPercent}% off
                </span>
              )}
            </div>
            {tracker?.targetPrice != null && (
              <p className="tabular mt-1 text-sm text-ink-muted">
                Target: <span className="text-brand">{fmt.format(tracker.targetPrice)}</span>
              </p>
            )}
            {!product.inStock && (
              <span className="mt-1 inline-block rounded-full border border-border/15 bg-surface-raised px-2 py-0.5 text-xs font-medium text-ink-muted">
                Out of stock
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("primary", "lg", "text-center")}
          >
            Buy at {product.retailer} →
          </a>
          {tracker && (
            <button
              onClick={() => setConfirmingUntrack(true)}
              className="text-sm text-ink-faint transition hover:text-danger"
            >
              Stop tracking
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmingUntrack}
        title="Stop tracking this product?"
        description={`You'll stop tracking "${product.title}". Its price history stays intact for other trackers.`}
        confirmLabel="Stop tracking"
        busy={untracking}
        onConfirm={handleUntrack}
        onCancel={() => setConfirmingUntrack(false)}
      />

      {tracker && (
        <Card className="mt-6 flex items-center justify-between">
          <div>
            <div className="font-medium text-ink">Price-drop alerts</div>
            <div className="text-sm text-ink-faint">
              {tracker.alertsEnabled ? "You'll be notified when the price drops." : "Alerts are off for this product."}
            </div>
          </div>
          <Switch
            checked={tracker.alertsEnabled}
            onChange={handleToggleAlerts}
            label="Toggle price-drop alerts"
          />
        </Card>
      )}

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Lowest ever" value={fmt.format(stats.min)} />
          <StatTile label="Highest ever" value={fmt.format(stats.max)} />
          <StatTile label="Average" value={fmt.format(stats.avg)} />
          <StatTile label="Deal score" value={`${stats.dealScore}/100`} />
        </div>
      )}

      <div className="mt-6">
        <PriceChart history={history} currency={product.currency} />
      </div>
    </section>
  );
}
