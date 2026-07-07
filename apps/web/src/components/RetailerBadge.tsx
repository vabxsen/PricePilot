import { useState } from "react";
import { contrastInk, getRetailer } from "../lib/retailers.js";

function hostFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Shows which store a product is from: the store's real favicon logo plus its
 * name. The favicon comes from Google's favicon service keyed on the product's
 * hostname, so it shows the actual current logo for essentially any store —
 * including ones not in our known-retailer list — with no bundled assets.
 * It sits on a white tile so logos with dark/transparent art stay visible on
 * the near-black UI. If the image ever fails to load (offline, blocked), it
 * falls back to a brand-colored monogram (see lib/retailers).
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
  const host = hostFromUrl(url);
  const [failed, setFailed] = useState(false);
  const initial = label.charAt(0).toUpperCase();

  const dims =
    size === "md"
      ? { box: "h-6 w-6", mono: "text-xs", text: "text-sm" }
      : { box: "h-5 w-5", mono: "text-[10px]", text: "text-xs" };

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {host && !failed ? (
        <span
          className={`grid ${dims.box} shrink-0 place-items-center overflow-hidden rounded-[5px] bg-white p-0.5`}
        >
          <img
            src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
            alt=""
            className="h-full w-full object-contain"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        </span>
      ) : (
        <span
          className={`grid ${dims.box} ${dims.mono} shrink-0 place-items-center rounded-[5px] font-bold leading-none`}
          style={{ backgroundColor: color, color: contrastInk(color) }}
          aria-hidden="true"
        >
          {initial}
        </span>
      )}
      <span className={`truncate font-medium text-ink-muted ${dims.text}`}>{label}</span>
    </span>
  );
}
