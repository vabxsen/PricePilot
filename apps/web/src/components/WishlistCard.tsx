import type { WishlistItem } from "@pricepilot/shared";
import { formatMoney } from "../lib/format.js";
import { RetailerBadge } from "./RetailerBadge.js";
import { IconBox, IconExternal, IconPlus, IconTrash } from "./ui/icons.js";

/**
 * Saved (un-tracked) product card. Actions: promote to a tracked product,
 * open at the retailer, or remove from the wishlist.
 */
export function WishlistCard({
  item,
  onTrack,
  onRemove,
  tracking = false,
}: {
  item: WishlistItem;
  onTrack: () => void;
  onRemove: () => void;
  tracking?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-border/10 bg-surface p-4 transition hover:border-border/20">
      <div className="flex gap-3">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-md object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-md bg-surface-raised text-ink-faint">
            <IconBox size={22} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-ink">{item.title}</div>
          <div className="mt-0.5">
            <RetailerBadge retailer={item.retailer} url={item.url} />
          </div>
          <div className="tabular mt-1 text-lg font-semibold text-ink">
            {item.price !== null ? formatMoney(item.price, item.currency) : "—"}
          </div>
          {!item.inStock && (
            <span className="mt-1 inline-block rounded-full border border-border/15 bg-surface-raised px-2 py-0.5 text-xs font-medium text-ink-muted">
              Out of stock
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border/10 pt-3">
        <button
          type="button"
          onClick={onTrack}
          disabled={tracking}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-bg shadow-glow transition hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-50"
        >
          <IconPlus size={16} /> {tracking ? "Tracking…" : "Track"}
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open at ${item.retailer}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border/15 text-ink-faint transition hover:bg-surface-raised hover:text-ink"
        >
          <IconExternal size={16} />
        </a>
        <button
          type="button"
          onClick={onRemove}
          title="Remove from wishlist"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border/15 text-ink-faint transition hover:bg-surface-raised hover:text-danger"
        >
          <IconTrash size={16} />
        </button>
      </div>
    </div>
  );
}
