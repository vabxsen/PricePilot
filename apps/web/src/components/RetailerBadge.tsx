import { contrastInk, getRetailer } from "../lib/retailers.js";

/**
 * Shows which store a product is from: a monogram chip in the store's brand
 * color plus its name. See lib/retailers for why this is a color-coded
 * monogram rather than fetched logo artwork.
 */
export function RetailerBadge({
  retailer,
  url,
  size = "sm",
}: {
  retailer: string;
  url?: string;
  size?: "sm" | "md";
}) {
  const { label, color } = getRetailer(retailer, url);
  const initial = label.charAt(0).toUpperCase();

  const dims =
    size === "md"
      ? { box: "h-5 w-5 text-[11px]", text: "text-sm" }
      : { box: "h-4 w-4 text-[9px]", text: "text-xs" };

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span
        className={`grid ${dims.box} shrink-0 place-items-center rounded font-bold leading-none`}
        style={{ backgroundColor: color, color: contrastInk(color) }}
        aria-hidden="true"
      >
        {initial}
      </span>
      <span className={`truncate font-medium text-ink-muted ${dims.text}`}>{label}</span>
    </span>
  );
}
