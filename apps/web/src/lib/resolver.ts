import type { PriceSnapshot } from "@pricepilot/shared";

export interface ResolvedProduct extends PriceSnapshot {
  retailer: string;
  url: string;
}

const RESOLVER_URL = import.meta.env.VITE_RESOLVER_URL as string | undefined;

/** Calls the Cloudflare Worker resolver — see workers/resolver. */
export async function resolveProductUrl(url: string): Promise<ResolvedProduct> {
  if (!RESOLVER_URL) {
    throw new Error("VITE_RESOLVER_URL is not configured — see .env.example.");
  }
  const res = await fetch(`${RESOLVER_URL}/resolve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json()) as ResolvedProduct | { error: string };
  if (!res.ok || "error" in data) {
    throw new Error("error" in data ? data.error : `resolver responded ${res.status}`);
  }
  return data;
}
