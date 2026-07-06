import type { PriceSnapshot } from "./types.js";

/**
 * Retailer-agnostic price extraction from raw HTML — regex-based (no DOM
 * parser), so this same logic runs identically in Node (the scraper) and at
 * the edge (the Cloudflare Worker resolver, which has no DOM/cheerio).
 * Tier 1: schema.org JSON-LD Product/Offer. Tier 2: OpenGraph product meta.
 */

const NAMED_ENTITIES: Record<string, string> = {
  quot: '"',
  amp: "&",
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
};

/**
 * Some retailers HTML-escape text inside their JSON-LD blocks (invalid per
 * spec, but common in the wild — e.g. `16&quot;` instead of `16"`). Decode
 * the common named/numeric entities so titles render correctly.
 */
function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1]?.toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

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
