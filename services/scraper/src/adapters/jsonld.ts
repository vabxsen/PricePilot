import type { PriceSnapshot } from "@pricepilot/shared";
import * as cheerio from "cheerio";

/**
 * Generic, retailer-agnostic price extractor.
 * Tier 1: schema.org JSON-LD Product/Offer  (most reliable, no browser)
 * Tier 2: OpenGraph product meta tags
 * This covers a large share of scraping-tolerant retailers on the free tier.
 * Per-retailer selector adapters are added in S3 for sites that need them.
 */

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

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Walk arbitrary JSON-LD looking for the first node with an Offer. */
function findOffer(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findOffer(item);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    const isProduct =
      type === "Product" || (Array.isArray(type) && type.includes("Product"));
    if (isProduct && obj["offers"]) {
      const offers = Array.isArray(obj["offers"]) ? obj["offers"][0] : obj["offers"];
      return { product: obj, offer: offers } as Record<string, unknown>;
    }
    for (const key of ["@graph", "mainEntity"]) {
      if (obj[key]) {
        const found = findOffer(obj[key]);
        if (found) return found;
      }
    }
  }
  return null;
}

export function extractFromHtml(html: string): PriceSnapshot {
  const $ = cheerio.load(html);

  // Tier 1: JSON-LD
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const el of scripts) {
    const raw = $(el).contents().text();
    if (!raw.trim()) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const hit = findOffer(parsed);
    if (hit) {
      const product = hit["product"] as Record<string, unknown>;
      const offer = hit["offer"] as Record<string, unknown>;
      const price = toNumber(offer["price"] ?? offer["lowPrice"]);
      const availability = String(offer["availability"] ?? "").toLowerCase();
      const inStock = availability === "" ? price !== null : availability.includes("instock");
      return {
        title: typeof product["name"] === "string" ? (product["name"] as string) : undefined,
        brand:
          typeof product["brand"] === "object" && product["brand"]
            ? String((product["brand"] as Record<string, unknown>)["name"] ?? "")
            : typeof product["brand"] === "string"
              ? (product["brand"] as string)
              : undefined,
        imageUrl: Array.isArray(product["image"])
          ? String(product["image"][0])
          : typeof product["image"] === "string"
            ? (product["image"] as string)
            : undefined,
        price,
        currency:
          typeof offer["priceCurrency"] === "string"
            ? (offer["priceCurrency"] as string)
            : undefined,
        inStock,
        source: "jsonld",
      };
    }
  }

  // Tier 2: OpenGraph
  const ogPrice = toNumber($('meta[property="product:price:amount"]').attr("content"));
  if (ogPrice !== null) {
    return {
      title: $('meta[property="og:title"]').attr("content") ?? undefined,
      imageUrl: $('meta[property="og:image"]').attr("content") ?? undefined,
      price: ogPrice,
      currency: $('meta[property="product:price:currency"]').attr("content") ?? undefined,
      inStock: true,
      source: "opengraph",
    };
  }

  return { price: null, inStock: false, source: "jsonld" };
}

export async function scrape(url: string): Promise<PriceSnapshot> {
  const html = await fetchHtml(url);
  return extractFromHtml(html);
}
