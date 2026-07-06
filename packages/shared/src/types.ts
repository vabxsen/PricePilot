import { z } from "zod";

/**
 * Firestore data model for the Spark-plan MVP.
 * These schemas are the single source of truth for both the web app
 * (optimistic UI / validation) and the scraper (authoritative writes).
 * See docs/07-spark-mvp.md.
 */

export const Plan = z.enum(["free", "pro", "business"]);
export type Plan = z.infer<typeof Plan>;

export const Channel = z.enum(["email", "web_push"]);
export type Channel = z.infer<typeof Channel>;

export const AlertType = z.enum([
  "target_price",
  "percent_drop",
  "all_time_low",
  "back_in_stock",
]);
export type AlertType = z.infer<typeof AlertType>;

export const PriceSource = z.enum(["jsonld", "opengraph", "selector", "manual"]);
export type PriceSource = z.infer<typeof PriceSource>;

export const AlertRule = z.object({
  id: z.string(),
  type: AlertType,
  /** Target price (target_price) or percent 0-100 (percent_drop). */
  threshold: z.number().nonnegative().optional(),
  channels: z.array(Channel).min(1),
  /** false = notify once; true = notify on every qualifying drop. */
  repeat: z.boolean().default(false),
  lastFiredAt: z.number().optional(),
  snoozeUntil: z.number().optional(),
});
export type AlertRule = z.infer<typeof AlertRule>;

/** users/{uid} */
export const UserDoc = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoUrl: z.string().url().optional(),
  plan: Plan.default("free"),
  createdAt: z.number(),
  fcmTokens: z.array(z.string()).default([]),
  notificationPrefs: z
    .object({
      email: z.boolean().default(true),
      webPush: z.boolean().default(false),
      quietHours: z.tuple([z.number(), z.number()]).optional(),
    })
    .default({ email: true, webPush: false }),
});
export type UserDoc = z.infer<typeof UserDoc>;

/** products/{productId} — canonical, deduped scrape target. */
export const ProductDoc = z.object({
  id: z.string(),
  title: z.string(),
  brand: z.string().optional(),
  imageUrl: z.string().url().optional(),
  retailer: z.string(),
  url: z.string().url(),
  externalId: z.string().optional(),
  currency: z.string().length(3),
  currentPrice: z.number().nonnegative().nullable(),
  inStock: z.boolean().default(true),
  allTimeLow: z.number().nonnegative().nullable().optional(),
  allTimeHigh: z.number().nonnegative().nullable().optional(),
  trackerCount: z.number().int().nonnegative().default(0),
  lastCheckedAt: z.number().nullable().optional(),
  nextCheckAt: z.number().nullable().optional(),
  /** seconds; adaptive by plan + volatility. */
  checkInterval: z.number().int().positive().default(86_400),
  createdAt: z.number(),
});
export type ProductDoc = z.infer<typeof ProductDoc>;

/** products/{productId}/history/{autoId} — append-only on change. */
export const PricePoint = z.object({
  ts: z.number(),
  price: z.number().nonnegative(),
  inStock: z.boolean(),
  source: PriceSource,
});
export type PricePoint = z.infer<typeof PricePoint>;

/** users/{uid}/trackers/{trackerId} */
export const TrackerDoc = z.object({
  id: z.string(),
  productId: z.string(),
  priceAtAdd: z.number().nonnegative(),
  paused: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  alertRules: z.array(AlertRule).default([]),
  createdAt: z.number(),
});
export type TrackerDoc = z.infer<typeof TrackerDoc>;

/** A price reading produced by a scraper adapter before it is persisted. */
export const PriceSnapshot = z.object({
  title: z.string().optional(),
  brand: z.string().optional(),
  imageUrl: z.string().url().optional(),
  price: z.number().nonnegative().nullable(),
  currency: z.string().length(3).optional(),
  inStock: z.boolean(),
  source: PriceSource,
});
export type PriceSnapshot = z.infer<typeof PriceSnapshot>;
