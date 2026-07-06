import type { ProductDoc, TrackerDoc } from "@pricepilot/shared";
import { Link } from "react-router-dom";
import { formatMoney } from "../lib/format.js";
import { Delta } from "./Delta.js";
import { Switch } from "./ui/Switch.js";
import { IconBox, IconExternal, IconTrash } from "./ui/icons.js";

/**
 * Rich management row for the Products page: image, prices, change, and the
 * per-tracker actions (alerts toggle, open retailer, stop tracking). Product
 * data is passed in (the parent already subscribes) so this stays presentational.
 */
export function ProductListItem({
  tracker,
  product,
  onToggleAlerts,
  onRemove,
}: {
  tracker: TrackerDoc;
  product: ProductDoc | null;
  onToggleAlerts: (value: boolean) => void;
  onRemove: () => void;
}) {
  if (!product) {
    return (
      <div className="rounded-lg border border-border/10 bg-surface p-4 text-sm text-ink-faint">
        Product no longer available.
      </div>
    );
  }

  const targetMet =
    tracker.targetPrice != null &&
    product.currentPrice !== null &&
    product.currentPrice <= tracker.targetPrice;

  return (
    <div className="rounded-lg border border-border/10 bg-surface p-4 transition hover:border-border/20">
      <div className="flex gap-3">
        <Link to={`/product/${product.id}`} className="shrink-0">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt=""
              className="h-16 w-16 rounded-md object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-md bg-surface-raised text-ink-faint">
              <IconBox size={22} />
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <Link to={`/product/${product.id}`} className="min-w-0">
              <div className="truncate font-medium text-ink">{product.title}</div>
              <div className="truncate text-xs text-ink-faint">{product.retailer}</div>
            </Link>
            <div className="shrink-0 text-right">
              <div className="tabular text-lg font-semibold text-ink">
                {product.currentPrice !== null
                  ? formatMoney(product.currentPrice, product.currency)
                  : "—"}
              </div>
              {tracker.targetPrice != null && (
                <div className="tabular text-xs text-ink-faint">
                  Target {formatMoney(tracker.targetPrice, product.currency)}
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {product.currentPrice !== null && (
              <Delta
                from={tracker.priceAtAdd}
                to={product.currentPrice}
                currency={product.currency}
              />
            )}
            {targetMet && (
              <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
                Target met
              </span>
            )}
            {!product.inStock && (
              <span className="rounded-full border border-border/15 bg-surface-raised px-2 py-0.5 text-xs font-medium text-ink-muted">
                Out of stock
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/10 pt-3">
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <Switch
            checked={tracker.alertsEnabled}
            onChange={onToggleAlerts}
            label="Toggle price-drop alerts"
          />
          Alerts
        </label>
        <div className="flex items-center gap-1">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Buy at ${product.retailer}`}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-faint transition hover:bg-surface-raised hover:text-ink"
          >
            <IconExternal size={16} />
          </a>
          <button
            type="button"
            onClick={onRemove}
            title="Stop tracking"
            className="grid h-8 w-8 place-items-center rounded-md text-ink-faint transition hover:bg-surface-raised hover:text-danger"
          >
            <IconTrash size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
