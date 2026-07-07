import type { TrackerDoc } from "@pricepilot/shared";
import { Link } from "react-router-dom";
import { useProduct, useProductHistory } from "../lib/trackers.js";
import { Delta } from "./Delta.js";
import { RetailerBadge } from "./RetailerBadge.js";
import { Sparkline } from "./Sparkline.js";

export function ProductCard({ tracker }: { tracker: TrackerDoc }) {
  const { product, loading } = useProduct(tracker.productId);
  const { history } = useProductHistory(tracker.productId);

  if (loading) {
    return <div className="h-32 animate-pulse rounded-lg border border-border/10 bg-surface" />;
  }
  if (!product) {
    return (
      <div className="rounded-lg border border-border/10 bg-surface p-4 text-sm text-ink-faint">
        Product no longer available.
      </div>
    );
  }

  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: product.currency });

  return (
    <Link
      to={`/product/${product.id}`}
      className="block min-w-0 rounded-lg border border-border/10 bg-surface p-4 transition hover:border-brand/50 hover:bg-surface-raised"
    >
      <div className="flex gap-3">
        {product.imageUrl && (
          <img src={product.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-ink">{product.title}</div>
          <div className="mt-0.5">
            <RetailerBadge retailer={product.retailer} url={product.url} />
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
            <span className="tabular text-lg font-semibold text-ink">
              {product.currentPrice !== null ? fmt.format(product.currentPrice) : "—"}
            </span>
            {product.discountPercent != null && product.discountPercent > 0 && (
              <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[11px] font-medium text-brand">
                {product.discountPercent}% off
              </span>
            )}
          </div>
          {product.currentPrice !== null && (
            <Delta from={tracker.priceAtAdd} to={product.currentPrice} currency={product.currency} />
          )}
          {tracker.targetPrice != null && (
            <div className="tabular mt-0.5 text-xs text-ink-faint">
              Target: {fmt.format(tracker.targetPrice)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        {!product.inStock ? (
          <div className="inline-block rounded-full border border-border/15 bg-surface-raised px-2 py-0.5 text-xs font-medium text-ink-muted">
            Out of stock
          </div>
        ) : (
          <span />
        )}
        <div className="text-brand">
          <Sparkline data={history.map((h) => h.price)} />
        </div>
      </div>
    </Link>
  );
}
