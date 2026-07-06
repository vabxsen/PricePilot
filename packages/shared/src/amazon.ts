import { decodeHtmlEntities, stripTags, toNumber } from "./html-utils.js";
import type { PriceSnapshot } from "./types.js";

/**
 * Site-specific extraction for Amazon product pages. Amazon almost never
 * ships schema.org JSON-LD or OpenGraph product/price meta tags — price,
 * title, and availability live in retailer-specific markup instead — so the
 * generic tiers in extract.ts silently return nothing for it. This module
 * reads Amazon's actual DOM patterns directly (regex-based, no DOM parser,
 * so it runs identically in Node and at the Cloudflare Worker edge).
 */

/** Matches amazon.<any TLD> (amazon.in, amazon.co.uk, amazon.com.au, ...) and Amazon's link shorteners. */
export function isAmazonHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return host === "amzn.in" || host === "amzn.to" || host === "a.co" || /^amazon\.[a-z.]+$/.test(host);
}

const BOT_CHECK_MARKERS = [
  "Enter the characters you see below",
  "Type the characters you see in this image",
  "/errors/validateCaptcha",
  "Sorry, we just need to make sure you're not a robot",
  "<title>Robot Check</title>",
  "To discuss automated access to Amazon data please contact",
];

/** Detects Amazon's CAPTCHA / bot-check / rate-limit interstitial pages. */
function detectBotCheck(html: string): string | null {
  for (const marker of BOT_CHECK_MARKERS) {
    if (html.includes(marker)) {
      return `Amazon returned a bot-check/CAPTCHA page instead of the product page (matched "${marker}")`;
    }
  }
  return null;
}

function extractTitle(html: string): string | undefined {
  const m = html.match(/<span[^>]+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i);
  if (!m?.[1]) return undefined;
  const text = decodeHtmlEntities(stripTags(m[1]).trim().replace(/\s+/g, " "));
  return text || undefined;
}

function extractBrand(html: string): string | undefined {
  const m = html.match(/id=["']bylineInfo["'][^>]*>([\s\S]*?)<\/a>/i);
  if (!m?.[1]) return undefined;
  const text = decodeHtmlEntities(stripTags(m[1]).trim());
  const cleaned = text
    .replace(/^(Visit the|Brand:|Store:)\s*/i, "")
    .replace(/\s*Store$/i, "")
    .trim();
  return cleaned || undefined;
}

function extractImage(html: string): string | undefined {
  let m = html.match(/id=["']landingImage["'][^>]*\sdata-old-hires=["']([^"']+)["']/i);
  if (m?.[1]) return m[1];

  m = html.match(/id=["'](?:landingImage|imgBlkFront)["'][^>]*\sdata-a-dynamic-image=["']([^"']+)["']/i);
  if (m?.[1]) {
    try {
      const parsed = JSON.parse(decodeHtmlEntities(m[1])) as Record<string, unknown>;
      const first = Object.keys(parsed)[0];
      if (first) return first;
    } catch {
      // malformed dynamic-image JSON — fall through to the plain src below
    }
  }

  m = html.match(/id=["']landingImage["'][^>]*\ssrc=["']([^"']+)["']/i);
  return m?.[1];
}

/** Grabs a bounded slice of HTML starting at the first match of `marker`, to scope later regexes without needing balanced-tag parsing. */
function sliceAtMarker(html: string, marker: RegExp, length = 6000): string | null {
  const m = html.match(marker);
  if (m?.index === undefined) return null;
  return html.slice(m.index, m.index + length);
}

const PRICE_SCOPE_MARKERS = [
  /id=["']corePriceDisplay_desktop_feature_div["']/i,
  /id=["']corePrice_feature_div["']/i,
  /id=["']apex_desktop["']/i,
];

/** `<span class="a-price ...">...<span class="a-offscreen">₹1,234.00</span>` — the "a-text-price" variant is Amazon's strikethrough/MRP price. */
const PRICE_SPAN_RE =
  /<span[^>]+class=["']a-price([^"']*)["'][^>]*>\s*<span[^>]+class=["']a-offscreen["'][^>]*>([^<]+)<\/span>/gi;

const LEGACY_PRICE_RE =
  /id=["'](?:priceblock_ourprice|priceblock_dealprice|priceblock_saleprice)["'][^>]*>([^<]+)</i;

const SAVINGS_RE = /class=["'][^"']*savingsPercentage[^"']*["'][^>]*>\s*-?\s*(\d+)\s*%/i;

/** Normalizes a non-breaking space (Amazon uses   as a thousands/currency separator in price text) to a regular space. */
function normalizeNbsp(text: string): string {
  return text.replace(/ /g, " ");
}

function parsePriceAmount(text: string): { amount: number | null; symbol: string | null } {
  const cleaned = normalizeNbsp(decodeHtmlEntities(text)).trim();
  const m = cleaned.match(/([₹$£€¥]|Rs\.?)?\s*([\d,]+(?:\.\d+)?)/);
  if (!m) return { amount: null, symbol: null };
  const amount = toNumber(m[2]);
  return { amount, symbol: m[1] ?? null };
}

/**
 * Some Amazon price-display variants ("apex" pricing) leave the accessible
 * `.a-offscreen` span blank and render the digits only in a visual sibling
 * (`.a-price-symbol` + `.a-price-whole` + optional `.a-price-fraction`).
 * Reconstructs the amount from those when the offscreen text was empty.
 * Bounded to a small window right after the price span, and stops early if
 * another `a-price` block starts first, to avoid bleeding into unrelated
 * markup.
 */
function reconstructFromWholeFraction(haystack: string, searchFrom: number): number | null {
  const window = haystack.slice(searchFrom, searchFrom + 200);
  const nextBlock = window.search(/class=["']a-price(?!-)/);
  const scoped = nextBlock === -1 ? window : window.slice(0, nextBlock);

  const wholeMatch = scoped.match(/class=["']a-price-whole["'][^>]*>([^<]+)</i);
  if (!wholeMatch?.[1]) return null;
  const whole = wholeMatch[1].replace(/[^\d]/g, "");
  if (!whole) return null;

  const fractionMatch = scoped.match(/class=["']a-price-fraction["'][^>]*>([^<]+)</i);
  const fraction = fractionMatch?.[1]?.replace(/[^\d]/g, "") || "00";

  return toNumber(`${whole}.${fraction}`);
}

/** Amazon's screen-reader label for the buy-box price, e.g. "₹3,999.00 with 27 percent savings" — a stable fallback across visual layout experiments. */
const ACCESSIBILITY_PRICE_RE =
  /id=["']apex-pricetopay-accessibility-label["'][^>]*>([^<]+)</i;

interface PriceExtraction {
  current: number | null;
  original: number | null;
  symbol: string | null;
}

function extractPrices(html: string): PriceExtraction {
  let scope: string | null = null;
  for (const marker of PRICE_SCOPE_MARKERS) {
    scope = sliceAtMarker(html, marker);
    if (scope) break;
  }
  const haystack = scope ?? html;

  let current: number | null = null;
  let original: number | null = null;
  let symbol: string | null = null;

  for (const match of haystack.matchAll(PRICE_SPAN_RE)) {
    const extraClasses = match[1] ?? "";
    let { amount, symbol: sym } = parsePriceAmount(match[2] ?? "");
    const isStrikethrough = /a-text-price/.test(extraClasses);

    if (amount === null && !isStrikethrough) {
      // The accessible span was blank (an "apex" pricing variant) — fall
      // back to reconstructing the digits from the visual whole/fraction spans.
      const matchEnd = (match.index ?? 0) + match[0].length;
      amount = reconstructFromWholeFraction(haystack, matchEnd);
    }
    if (amount === null) continue;

    if (isStrikethrough) {
      if (original === null) original = amount;
    } else if (current === null) {
      current = amount;
      symbol = symbol ?? sym;
    }
    if (current !== null && original !== null) break;
  }

  if (current === null) {
    const legacy = haystack.match(LEGACY_PRICE_RE) ?? html.match(LEGACY_PRICE_RE);
    if (legacy?.[1]) {
      const { amount, symbol: sym } = parsePriceAmount(legacy[1]);
      current = amount;
      symbol = symbol ?? sym;
    }
  }

  if (current === null) {
    const accessible = html.match(ACCESSIBILITY_PRICE_RE);
    if (accessible?.[1]) {
      const { amount, symbol: sym } = parsePriceAmount(accessible[1]);
      current = amount;
      symbol = symbol ?? sym;
    }
  }

  return { current, original, symbol };
}

function extractSavingsPercent(html: string): number | null {
  const m = html.match(SAVINGS_RE);
  return m?.[1] ? toNumber(m[1]) : null;
}

function extractAvailability(html: string): boolean | null {
  const m = html.match(/id=["']availability["'][^>]*>([\s\S]{0,400}?)<\/div>/i);
  if (!m?.[1]) return null;
  const text = stripTags(m[1]).trim().toLowerCase();
  if (!text) return null;
  if (/(currently unavailable|out of stock|temporarily out of stock|unavailable)/.test(text)) return false;
  if (/(in stock|available|only \d+ left)/.test(text)) return true;
  return null;
}

const DOMAIN_CURRENCY: Record<string, string> = {
  "amazon.com": "USD",
  "amazon.in": "INR",
  "amazon.co.uk": "GBP",
  "amazon.de": "EUR",
  "amazon.fr": "EUR",
  "amazon.it": "EUR",
  "amazon.es": "EUR",
  "amazon.nl": "EUR",
  "amazon.se": "SEK",
  "amazon.pl": "PLN",
  "amazon.com.be": "EUR",
  "amazon.ca": "CAD",
  "amazon.com.mx": "MXN",
  "amazon.com.br": "BRL",
  "amazon.com.au": "AUD",
  "amazon.co.jp": "JPY",
  "amazon.sg": "SGD",
  "amazon.ae": "AED",
  "amazon.sa": "SAR",
  "amazon.eg": "EGP",
  "amazon.com.tr": "TRY",
};

const SYMBOL_CURRENCY: Record<string, string> = {
  "₹": "INR",
  Rs: "INR",
  "Rs.": "INR",
  $: "USD",
  "£": "GBP",
  "€": "EUR",
  "¥": "JPY",
};

function currencyFor(hostname: string, symbol: string | null): string {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (DOMAIN_CURRENCY[host]) return DOMAIN_CURRENCY[host];
  if (symbol && SYMBOL_CURRENCY[symbol]) return SYMBOL_CURRENCY[symbol]!;
  return "USD";
}

export interface AmazonExtractResult {
  snapshot: PriceSnapshot | null;
  /** Present when snapshot is null — the specific reason nothing could be read. */
  reason: string | null;
}

/**
 * Extract a product snapshot from a raw Amazon product page. Returns
 * `snapshot: null` (with a `reason`) when the page is a bot-check/CAPTCHA
 * interstitial or its markup wasn't recognized at all (no title AND no
 * price found) — a strong signal the page genuinely couldn't be read,
 * rather than a real listing that simply has no price.
 */
export function extractAmazonProduct(html: string, hostname: string): AmazonExtractResult {
  const botCheck = detectBotCheck(html);
  if (botCheck) return { snapshot: null, reason: botCheck };

  const title = extractTitle(html);
  const { current, original, symbol } = extractPrices(html);

  if (!title && current === null) {
    return {
      snapshot: null,
      reason:
        "Amazon markup not recognized — no #productTitle and no price element found " +
        "(the page layout may have changed, or this isn't a product page)",
    };
  }

  const savingsFromPage = extractSavingsPercent(html);
  const discountPercent =
    savingsFromPage ??
    (original !== null && current !== null && original > current
      ? Math.round(((original - current) / original) * 100)
      : null);

  const availability = extractAvailability(html);

  return {
    snapshot: {
      title,
      brand: extractBrand(html),
      imageUrl: extractImage(html),
      price: current,
      originalPrice: original,
      discountPercent,
      currency: currencyFor(hostname, symbol),
      inStock: availability ?? current !== null,
      source: "selector",
    },
    reason: null,
  };
}
