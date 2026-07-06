import type { WishlistItem } from "@pricepilot/shared";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { WishlistCard } from "../components/WishlistCard.js";
import { buttonClasses } from "../components/ui/Button.js";
import { IconHeart, IconPlus } from "../components/ui/icons.js";
import { useAuth } from "../lib/auth.js";
import { moveWishlistItemToTracked, removeFromWishlist, useWishlist } from "../lib/wishlist.js";

export function Wishlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, loading } = useWishlist(user?.uid);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTrack(item: WishlistItem) {
    if (!user) return;
    setBusyId(item.id);
    setError(null);
    try {
      const productId = await moveWishlistItemToTracked(user.uid, item);
      navigate(`/product/${productId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusyId(null);
    }
  }

  async function handleRemove(item: WishlistItem) {
    if (!user) return;
    await removeFromWishlist(user.uid, item.id);
  }

  return (
    <section className="animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Wishlist</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {items.length} saved {items.length === 1 ? "item" : "items"} · not tracked yet
          </p>
        </div>
        <Link
          to="/add"
          className={`${buttonClasses("primary", "md")} hidden items-center gap-2 md:inline-flex`}
        >
          <IconPlus size={18} /> Add a product
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {loading && items.length === 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg border border-border/10 bg-surface" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border/15 bg-surface/40 p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-brand">
            <IconHeart size={22} />
          </div>
          <p className="mt-4 font-medium text-ink">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-ink-muted">
            Save products you're eyeing without tracking them yet — then track them in one tap.
          </p>
          <Link
            to="/add"
            className={`${buttonClasses("primary", "md")} mt-5 inline-flex items-center gap-2`}
          >
            <IconPlus size={18} /> Add a product
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              tracking={busyId === item.id}
              onTrack={() => handleTrack(item)}
              onRemove={() => handleRemove(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
