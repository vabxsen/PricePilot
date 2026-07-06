import { extractAmazonProduct, isAmazonHostname } from "./amazon.js";
import { decodeHtmlEntities, toNumber } from "./html-utils.js";
import type { PriceSnapshot } from "./types.js";

/**
 * Retailer-agnostic price extraction from raw HTML — regex-based (no DOM
 * parser), so this same logic runs identically in Node (the scraper) and at
 * the edge (the Cloudflare Worker resolver, which has no DOM/cheerio).
 * Tier 1: schema.org JSON-LD Product/Offer. Tier 2: OpenGraph product meta.
 */

interface OfferHit {
  product: Record<string, unknown>;
  offer: Record<string, unknown>;
}

function findOffer(node: unknown): OfferHit | null {
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
    const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
    if (isProduct && obj["offers"]) {
      const offersRaw = obj["offers"];
      const offer = Array.isArray(offersRaw) ? offersRaw[0] : offersRaw;
      if (offer && typeof offer === "object") {
        return { product: obj, offer: offer as Record<string, unknown> };
      }
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

const JSONLD_RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  for (const match of html.matchAll(JSONLD_RE)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // malformed JSON-LD is common on real-world pages — skip it
    }
  }
  return blocks;
}

function metaContent(html: string, property: string): string | undefined {
  const re = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i");
  const alt = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i");
  return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? undefined;
}

export function extractPriceFromHtml(html: string): PriceSnapshot {
  for (const block of extractJsonLdBlocks(html)) {
    const hit = findOffer(block);
    if (!hit) continue;
    const { product, offer } = hit;

    const price = toNumber(offer["price"] ?? offer["lowPrice"]);
    const availability = String(offer["availability"] ?? "").toLowerCase();
    const inStock = availability === "" ? price !== null : availability.includes("instock");

    const brandField = product["brand"];
    const brand =
      brandField && typeof brandField === "object"
        ? String((brandField as Record<string, unknown>)["name"] ?? "") || undefined
        : typeof brandField === "string"
          ? brandField
          : undefined;

    const imageField = product["image"];
    const imageUrl = Array.isArray(imageField)
      ? String(imageField[0])
      : typeof imageField === "string"
        ? imageField
        : undefined;

    return {
      title: typeof product["name"] === "string" ? decodeHtmlEntities(product["name"]) : undefined,
      brand: brand ? decodeHtmlEntities(brand) : undefined,
      imageUrl,
      price,
      currency: typeof offer["priceCurrency"] === "string" ? (offer["priceCurrency"] as string) : undefined,
      inStock,
      source: "jsonld",
    };
  }

  const ogPrice = toNumber(metaContent(html, "product:price:amount"));
  if (ogPrice !== null) {
    const ogTitle = metaContent(html, "og:title");
    return {
      title: ogTitle ? decodeHtmlEntities(ogTitle) : undefined,
      imageUrl: metaContent(html, "og:image"),
      price: ogPrice,
      currency: metaContent(html, "product:price:currency"),
      inStock: true,
      source: "opengraph",
    };
  }

  return { price: null, inStock: false, source: "jsonld" };
}

export interface ProductExtractResult {
  snapshot: PriceSnapshot;
  /**
   * Non-null only when extraction essentially failed — no title AND no
   * price were found anywhere (bot-check/CAPTCHA page, unsupported markup,
   * or a non-product page). A human-readable reason for logs and for
   * surfacing a real error instead of a blank "Untitled product" result.
   */
  reason: string | null;
}

/**
 * Retailer-aware entry point. Amazon pages rarely carry JSON-LD/OpenGraph
 * product data, so recognized Amazon URLs go through a dedicated DOM-pattern
 * extractor (see amazon.ts) before falling back to the generic tiers below.
 * Reports a `reason` when nothing usable was found at all, so callers (the
 * resolver Worker, the scraper) can log the exact cause and avoid silently
 * returning placeholder data for a page that truly couldn't be read.
 */
export function extractProductSnapshot(html: string, url: string): ProductExtractResult {
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    // malformed url — fall through to generic extraction below
  }

  if (hostname && isAmazonHostname(hostname)) {
    const { snapshot, reason } = extractAmazonProduct(html, hostname);
    if (snapshot) return { snapshot, reason: null };
    // Deliberately do NOT fall back to the generic JSON-LD/OpenGraph tiers
    // here. Amazon search/category/cart pages have no #productTitle (so the
    // Amazon extractor correctly rejects them) but often DO embed JSON-LD
    // Product markup for the individual listed items (for Google rich
    // snippets) — a generic fallback would silently return a real price for
    // the WRONG product. Trust the Amazon-specific verdict.
    return { snapshot: { price: null, inStock: false, source: "selector" }, reason };
  }

  const generic = extractPriceFromHtml(html);
  if (!generic.title && generic.price === null) {
    return {
      snapshot: generic,
      reason: "No JSON-LD Product/Offer or OpenGraph product meta tags found on this page",
    };
  }
  return { snapshot: generic, reason: null };
}
