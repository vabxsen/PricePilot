import { WishlistItem, productIdFromUrl } from "@pricepilot/shared";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getDb } from "./firebase.js";
import type { ResolvedProduct } from "./resolver.js";
import { addTrackerForProduct } from "./trackers.js";

/** Live list of the signed-in user's saved (un-tracked) products, newest first. */
export function useWishlist(uid: string | undefined) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    const q = query(collection(getDb(), "users", uid, "wishlist"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const parsed: WishlistItem[] = [];
      for (const d of snap.docs) {
        const result = WishlistItem.safeParse({ id: d.id, ...d.data() });
        if (result.success) parsed.push(result.data);
      }
      setItems(parsed);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return { items, loading };
}

/**
 * Save a resolved product to the wishlist without tracking it. Keyed by the
 * same URL-hash id used for products/trackers, so saving the same URL twice
 * just refreshes the snapshot instead of duplicating.
 */
export async function addToWishlist(uid: string, resolved: ResolvedProduct): Promise<string> {
  const id = await productIdFromUrl(resolved.url);
  const item: WishlistItem = {
    id,
    url: resolved.url,
    title: resolved.title ?? "Untitled product",
    brand: resolved.brand,
    imageUrl: resolved.imageUrl,
    retailer: resolved.retailer,
    currency: resolved.currency ?? "USD",
    price: resolved.price,
    inStock: resolved.inStock,
    source: resolved.source,
    createdAt: Date.now(),
  };
  await setDoc(doc(getDb(), "users", uid, "wishlist", id), item);
  return id;
}

export async function removeFromWishlist(uid: string, itemId: string): Promise<void> {
  await deleteDoc(doc(getDb(), "users", uid, "wishlist", itemId));
}

/**
 * Promote a wishlist item to a tracked product in one step: creates the
 * tracker from the saved snapshot, then removes the wishlist entry. Returns
 * the productId so callers can navigate to the product page.
 */
export async function moveWishlistItemToTracked(
  uid: string,
  item: WishlistItem,
): Promise<string> {
  const resolved: ResolvedProduct = {
    url: item.url,
    retailer: item.retailer,
    title: item.title,
    brand: item.brand,
    imageUrl: item.imageUrl,
    price: item.price,
    currency: item.currency,
    inStock: item.inStock,
    source: item.source,
  };
  const result = await addTrackerForProduct(uid, resolved);
  await removeFromWishlist(uid, item.id);
  return result.productId;
}
