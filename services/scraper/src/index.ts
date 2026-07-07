import {
  priceAnomalyReason,
  round2,
  type ProductDoc,
} from "@pricepilot/shared";
import type { DocumentReference } from "firebase-admin/firestore";
import { scrape } from "./adapters/jsonld.js";
import { initFirestore } from "./firebase.js";

/**
 * The PricePilot "engine": run on a schedule by GitHub Actions.
 * 1. Find products due for a check (nextCheckAt <= now).
 * 2. Scrape each (shared across all users tracking it).
 * 3. Write a history point on every successful check (continuous trace).
 * 4. Update the product summary + nextCheckAt.
 * Alert evaluation + notifications are added in S5.
 * See docs/07-spark-mvp.md.
 */

const BATCH_LIMIT = 50;

async function main() {
  const db = initFirestore();
  if (!db) process.exit(1);

  const now = Date.now();
  const due = await db
    .collection("products")
    .where("nextCheckAt", "<=", now)
    .limit(BATCH_LIMIT)
    .get();

  console.log(`[scrape] ${due.size} product(s) due at ${new Date(now).toISOString()}`);

  let recorded = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of due.docs) {
    const product = doc.data() as ProductDoc;
    try {
      const snap = await scrape(product.url);
      const price = snap.price === null ? null : round2(snap.price);

      const anomaly = priceAnomalyReason(price, product);
      if (anomaly) {
        console.warn(`[scrape] quarantined ${product.id}: ${anomaly}`);
        skipped++;
        await scheduleNext(doc.ref, product, now);
        continue;
      }

      // Record a history point on every successful check (whenever a price was
      // read), not only when it changed — this keeps the price chart a
      // continuous hourly trace instead of a sparse on-change line. Reads are
      // capped client-side (limitToLast(500)), so a growing series stays cheap.
      if (price !== null) {
        await doc.ref.collection("history").add({
          ts: now,
          price,
          inStock: snap.inStock,
          source: snap.source,
        });
        recorded++;
      }

      // Always record that we checked, but never let a failed read (price ===
      // null — e.g. the retailer blocked the request or changed its markup)
      // wipe a previously-good price/stock. We only overwrite currentPrice,
      // inStock, and the derived fields when the scrape actually returned a
      // price; a null read just advances the check timestamps.
      const update: Partial<ProductDoc> = {
        lastCheckedAt: now,
        nextCheckAt: now + product.checkInterval * 1000,
      };
      if (price !== null) {
        update.currentPrice = price;
        update.inStock = snap.inStock;
        // Admin SDK rejects literal `undefined`; most non-Amazon adapters
        // simply don't populate these.
        if (snap.originalPrice !== undefined) update.originalPrice = snap.originalPrice;
        if (snap.discountPercent !== undefined) update.discountPercent = snap.discountPercent;
        update.allTimeLow =
          product.allTimeLow == null ? price : Math.min(product.allTimeLow, price);
        update.allTimeHigh =
          product.allTimeHigh == null ? price : Math.max(product.allTimeHigh, price);
      }
      await doc.ref.set(update, { merge: true });
    } catch (err) {
      failed++;
      console.error(`[scrape] failed ${product.id} (${product.url}):`, (err as Error).message);
      // Never let a reschedule error escape the per-product boundary and fail
      // the whole run — one bad product must not block every other one.
      try {
        await scheduleNext(doc.ref, product, now);
      } catch (rescheduleErr) {
        console.error(`[scrape] could not reschedule ${product.id}:`, rescheduleErr);
      }
    }
  }

  console.log(`[scrape] done — recorded:${recorded} skipped:${skipped} failed:${failed}`);
}

async function scheduleNext(
  ref: DocumentReference,
  product: ProductDoc,
  now: number,
) {
  await ref.set(
    { lastCheckedAt: now, nextCheckAt: now + product.checkInterval * 1000 },
    { merge: true },
  );
}

main().catch((err) => {
  console.error("[scrape] fatal:", err);
  process.exit(1);
});
