import { isAmazonHostname } from "./amazon.js";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "ref_",
  "tag",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "spm",
]);

/**
 * Strips common tracking/affiliate query params and normalizes scheme/host/
 * trailing slash so the same product linked from different marketing sources
 * maps to one canonical URL — and one shared scrape target. Conservative by
 * design: it only removes a known non-product-defining allowlist, so it
 * won't accidentally merge distinct variants (size/color) into one product.
 */
export function normalizeProductUrl(input: string): string {
  const u = new URL(input);
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) u.searchParams.delete(key);
  }
  u.searchParams.sort();
  u.hash = "";
  const pathname = u.pathname.replace(/\/+$/, "");
  u.pathname = pathname === "" ? "/" : pathname;
  return u.toString();
}

/**
 * Deterministic Firestore-safe doc ID for a product URL (SHA-256, truncated
 * to 64 bits of hex — negligible collision risk at MVP scale). Uses Web
 * Crypto so the exact same function runs in the browser, Node, and the
 * Cloudflare Worker resolver.
 */
export async function productIdFromUrl(url: string): Promise<string> {
  const normalized = normalizeProductUrl(url);
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const RETAILER_NAMES: Record<string, string> = {
  "amazon.com": "Amazon",
  "bestbuy.com": "Best Buy",
  "target.com": "Target",
  "walmart.com": "Walmart",
  "ebay.com": "eBay",
  "etsy.com": "Etsy",
  "newegg.com": "Newegg",
};

/** Human-friendly retailer name derived from the hostname. */
export function retailerNameFromUrl(url: string): string {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  if (isAmazonHostname(host)) return "Amazon";
  if (RETAILER_NAMES[host]) return RETAILER_NAMES[host];
  const base = host.split(".").slice(-2, -1)[0] ?? host;
  return base.charAt(0).toUpperCase() + base.slice(1);
}
