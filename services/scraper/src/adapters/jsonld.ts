import type { PriceSnapshot } from "@pricepilot/shared";

/**
 * Route every scheduled check through the same Cloudflare Worker resolver
 * used by "Track this product", instead of fetching retailer pages directly
 * from the GitHub Actions runner. Verified empirically (2026-07-08): direct
 * fetches from the runner's IP were silently reading null price/out-of-stock
 * for the same URLs the resolver's edge IP reads correctly every time —
 * Amazon/Flipkart rate-limit or CAPTCHA the well-known GitHub Actions IP
 * ranges far more aggressively than Cloudflare's. The resolver already has
 * the retailer-aware extractor, bot-check detection, and a fetch timeout, so
 * there's no need for a second, less reliable fetch path here.
 */
const RESOLVER_URL = process.env["RESOLVER_URL"] || "https://pricepilot-resolver.vabxsen.workers.dev";

export async function scrape(url: string): Promise<PriceSnapshot> {
  const res = await fetch(`${RESOLVER_URL}/resolve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json()) as (PriceSnapshot & { retailer?: string; url?: string }) | { error: string };
  if (!res.ok || "error" in data) {
    throw new Error("error" in data ? data.error : `resolver responded ${res.status}`);
  }
  return data;
}
