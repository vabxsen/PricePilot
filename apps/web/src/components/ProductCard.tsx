import type { TrackerDoc } from "@pricepilot/shared";
import { Link } from "react-router-dom";
import { useProduct, useProductHistory } from "../lib/trackers.js";
import { Delta } from "./Delta.js";
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
      className="block rounded-lg border border-border/10 bg-surface p-4 transition hover:border-brand/50 hover:bg-surface-raised"
    >
      <div className="flex gap-3">
        {product.imageUrl && (
          <img src={product.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-ink">{product.title}</div>
          <div className="text-xs text-ink-faint">{product.retailer}</div>
          <div className="tabular mt-1 text-lg font-semibold text-ink">
            {product.currentPrice !== null ? fmt.format(product.currentPrice) : "—"}
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
