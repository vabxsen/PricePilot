import {
  ProductDoc,
  PricePoint,
  TrackerDoc,
  productIdFromUrl,
} from "@pricepilot/shared";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { getDb } from "./firebase.js";
import type { ResolvedProduct } from "./resolver.js";

/** Live list of the signed-in user's trackers, newest first. */
export function useTrackerList(uid: string | undefined) {
  const [trackers, setTrackers] = useState<TrackerDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setTrackers([]);
      setLoading(false);
      return;
    }
    const q = query(collection(getDb(), "users", uid, "trackers"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const parsed: TrackerDoc[] = [];
      for (const d of snap.docs) {
        const result = TrackerDoc.safeParse({ id: d.id, ...d.data() });
        if (result.success) parsed.push(result.data);
      }
      setTrackers(parsed);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return { trackers, loading };
}

/** Live product doc — updates automatically when the scraper writes a new price. */
export function useProduct(productId: string | undefined) {
  const [product, setProduct] = useState<ProductDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setLoading(false);
      return;
    }
    const ref = doc(getDb(), "products", productId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setProduct(null);
      } else {
        const result = ProductDoc.safeParse({ id: snap.id, ...snap.data() });
        setProduct(result.success ? result.data : null);
      }
      setLoading(false);
    });
    return unsub;
  }, [productId]);

  return { product, loading };
}

/** Price history for a product, most recent 500 points, ascending by time. */
export function useProductHistory(productId: string | undefined) {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setHistory([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(getDb(), "products", productId, "history"),
      orderBy("ts", "asc"),
      limitToLast(500),
    );
    const unsub = onSnapshot(q, (snap) => {
      const points: PricePoint[] = [];
      for (const d of snap.docs) {
        const result = PricePoint.safeParse(d.data());
        if (result.success) points.push(result.data);
      }
      setHistory(points);
      setLoading(false);
    });
    return unsub;
  }, [productId]);

  return { history, loading };
}

/**
 * Track a resolved product for a user: reuses an existing product doc if
 * this URL is already tracked by anyone (shared scrape target), otherwise
 * bootstraps a new one from the resolver preview. See firestore.rules for
 * the security model this depends on.
 */
export async function addTrackerForProduct(
  uid: string,
  resolved: ResolvedProduct,
): Promise<{ productId: string; trackerId: string; alreadyTracked: boolean }> {
  const db = getDb();
  const productId = await productIdFromUrl(resolved.url);

  const trackersRef = collection(db, "users", uid, "trackers");
  const existing = await getDocs(
    query(trackersRef, where("productId", "==", productId), limit(1)),
  );
  if (!existing.empty) {
    return { productId, trackerId: existing.docs[0]!.id, alreadyTracked: true };
  }

  const trackerRef = doc(trackersRef);
  const productRef = doc(db, "products", productId);

  await runTransaction(db, async (t) => {
    const productSnap = await t.get(productRef);
    const now = Date.now();

    if (!productSnap.exists()) {
      const newProduct: ProductDoc = {
        id: productId,
        title: resolved.title ?? "Untitled product",
        brand: resolved.brand,
        imageUrl: resolved.imageUrl,
        retailer: resolved.retailer,
        url: resolved.url,
        currency: resolved.currency ?? "USD",
        currentPrice: resolved.price,
        inStock: resolved.inStock,
        allTimeLow: resolved.price ?? undefined,
        allTimeHigh: resolved.price ?? undefined,
        trackerCount: 1,
        lastCheckedAt: now,
        nextCheckAt: now + 3_600_000,
        checkInterval: 86_400,
        createdAt: now,
      };
      t.set(productRef, newProduct);
    } else {
      t.update(productRef, { trackerCount: increment(1) });
    }

    const newTracker: TrackerDoc = {
      id: trackerRef.id,
      productId,
      priceAtAdd: resolved.price ?? 0,
      paused: false,
      tags: [],
      alertRules: [],
      createdAt: now,
    };
    t.set(trackerRef, newTracker);
  });

  return { productId, trackerId: trackerRef.id, alreadyTracked: false };
}

export async function removeTracker(uid: string, trackerId: string, productId: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, "users", uid, "trackers", trackerId));
  await updateDoc(doc(db, "products", productId), { trackerCount: increment(-1) });
}
