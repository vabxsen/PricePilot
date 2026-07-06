import { extractProductSnapshot, type PriceSnapshot } from "@pricepilot/shared";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 PricePilotBot/0.1";

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/**
 * Generic retailer-agnostic scrape: fetch + shared JSON-LD/OpenGraph parser.
 * The same parser also runs at the edge in the Cloudflare resolver Worker
 * (workers/resolver) so both paths behave identically. Per-retailer selector
 * adapters land in S3 for sites without structured data.
 */
export async function scrape(url: string): Promise<PriceSnapshot> {
  const html = await fetchHtml(url);
  const { snapshot, reason } = extractProductSnapshot(html, url);
  if (reason) {
    console.warn(`[scrape] extraction issue for ${url}: ${reason}`);
  }
  return snapshot;
}
