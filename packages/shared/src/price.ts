import type { AlertRule, PricePoint, ProductDoc } from "./types.js";

/** Round to 2dp to avoid float noise in comparisons/display. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Percentage drop from `from` to `to`, clamped at 0 (never negative). */
export function percentDrop(from: number, to: number): number {
  if (from <= 0) return 0;
  return Math.max(0, round2(((from - to) / from) * 100));
}

export interface PriceStats {
  min: number;
  max: number;
  avg: number;
  latest: number;
  /** 0-100: where the latest price sits between all-time low (0) and high (100). */
  percentile: number;
  /** 0-100 "deal score": 100 = at/below all-time low, 0 = at/above all-time high. */
  dealScore: number;
}

export function computeStats(history: PricePoint[]): PriceStats | null {
  const prices = history.map((h) => h.price).filter((p) => p > 0);
  if (prices.length === 0) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = round2(prices.reduce((a, b) => a + b, 0) / prices.length);
  const latest = prices[prices.length - 1]!;
  const span = max - min;
  const percentile = span === 0 ? 0 : round2(((latest - min) / span) * 100);
  const dealScore = round2(100 - percentile);
  return { min, max, avg, latest, percentile, dealScore };
}

/**
 * Sanity-check a scraped price against history before persisting.
 * Guards against parser bugs (e.g. $0, or a 90% "drop" from a bad selector)
 * becoming a bogus all-time-low. Returns null if the price looks trustworthy,
 * otherwise a human-readable reason to quarantine it.
 */
export function priceAnomalyReason(
  price: number | null,
  product: Pick<ProductDoc, "currentPrice">,
): string | null {
  if (price === null) return null; // out-of-stock / unresolved is handled elsewhere
  if (!Number.isFinite(price) || price <= 0) return "non-positive price";
  const prev = product.currentPrice;
  if (prev && prev > 0) {
    const ratio = price / prev;
    if (ratio > 5) return `price jumped ${ratio.toFixed(1)}x above previous`;
    if (ratio < 0.1) return `price dropped to ${(ratio * 100).toFixed(0)}% of previous`;
  }
  return null;
}

export interface AlertContext {
  newPrice: number | null;
  inStock: boolean;
  wasInStock: boolean;
  allTimeLow: number | null;
  /** Baseline a percent_drop is measured against (e.g. price at add). */
  referencePrice: number | null;
  now: number;
}

/**
 * Decide whether a single alert rule should fire for a new price point.
 * Pure and deterministic — used identically by the scraper (authoritative)
 * and the web app (preview). Caller is responsible for persisting lastFiredAt.
 */
export function shouldFire(rule: AlertRule, ctx: AlertContext): boolean {
  if (rule.snoozeUntil && ctx.now < rule.snoozeUntil) return false;
  if (!rule.repeat && rule.lastFiredAt) return false;

  switch (rule.type) {
    case "back_in_stock":
      return ctx.inStock && !ctx.wasInStock;

    case "target_price":
      return (
        ctx.newPrice !== null &&
        rule.threshold !== undefined &&
        ctx.newPrice <= rule.threshold
      );

    case "all_time_low":
      return (
        ctx.newPrice !== null &&
        ctx.allTimeLow !== null &&
        ctx.newPrice <= ctx.allTimeLow
      );

    case "percent_drop": {
      if (ctx.newPrice === null || rule.threshold === undefined) return false;
      if (ctx.referencePrice === null || ctx.referencePrice <= 0) return false;
      return percentDrop(ctx.referencePrice, ctx.newPrice) >= rule.threshold;
    }

    default:
      return false;
  }
}
