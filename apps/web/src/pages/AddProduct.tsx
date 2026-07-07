import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { Input } from "../components/ui/Input.js";
import { IconHeart, IconPlus } from "../components/ui/icons.js";
import { useAuth } from "../lib/auth.js";
import { resolveProductUrl, type ResolvedProduct } from "../lib/resolver.js";
import { addTrackerForProduct } from "../lib/trackers.js";
import { addToWishlist } from "../lib/wishlist.js";

export function AddProduct() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initialUrl = (location.state as { url?: string } | null)?.url ?? "";
  const [url, setUrl] = useState(initialUrl);
  const [preview, setPreview] = useState<ResolvedProduct | null>(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [status, setStatus] = useState<"idle" | "resolving" | "saving" | "wishlisting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleResolve(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPreview(null);
    setStatus("resolving");
    try {
      const resolved = await resolveProductUrl(url);
      setPreview(resolved);
      setTargetPrice(resolved.price !== null ? String(resolved.price) : "");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStatus("idle");
    }
  }

  async function handleConfirm() {
    if (!preview || !user) return;
    setStatus("saving");
    setError(null);
    try {
      const parsedTarget = targetPrice.trim() === "" ? null : Number(targetPrice);
      const result = await addTrackerForProduct(
        user.uid,
        preview,
        parsedTarget !== null && Number.isFinite(parsedTarget) ? parsedTarget : null,
      );
      navigate(`/product/${result.productId}`);
    } catch (err) {
      setError((err as Error).message);
      setStatus("idle");
    }
  }

  async function handleSaveToWishlist() {
    if (!preview || !user) return;
    setStatus("wishlisting");
    setError(null);
    try {
      await addToWishlist(user.uid, preview);
      navigate("/wishlist");
    } catch (err) {
      setError((err as Error).message);
      setStatus("idle");
    }
  }

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-ink">Track a new product</h1>
      <p className="mt-2 text-ink-muted">Paste a product URL and we'll pull the current price.</p>

      <form onSubmit={handleResolve} className="mt-6 flex gap-2">
        <Input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="flex-1"
        />
        <Button type="submit" size="lg" disabled={status === "resolving"}>
          {status === "resolving" ? "Resolving…" : "Resolve"}
        </Button>
      </form>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {preview && (
        <Card className="mt-6">
          <div className="flex gap-4">
            {preview.imageUrl && (
              <img src={preview.imageUrl} alt="" className="h-20 w-20 rounded-md object-cover" />
            )}
            <div className="flex-1">
              <div className="font-medium text-ink">{preview.title ?? "Untitled product"}</div>
              <div className="text-sm text-ink-faint">{preview.retailer}</div>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="tabular text-xl font-semibold text-ink">
                  {preview.price !== null
                    ? new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: preview.currency ?? "USD",
                      }).format(preview.price)
                    : "Price unavailable"}
                </span>
                {preview.originalPrice != null && preview.originalPrice > (preview.price ?? 0) && (
                  <span className="tabular text-sm text-ink-faint line-through">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: preview.currency ?? "USD",
                    }).format(preview.originalPrice)}
                  </span>
                )}
                {preview.discountPercent != null && preview.discountPercent > 0 && (
                  <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
                    {preview.discountPercent}% off
                  </span>
                )}
              </div>
            </div>
          </div>

          {preview.price === null && (
            <p className="mt-3 text-sm text-warning">
              We couldn't detect a price on this page. You can still track it — we'll keep checking.
            </p>
          )}

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-ink-muted">
              Target price <span className="text-ink-faint">(optional)</span>
            </span>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="e.g. 199.00"
            />
          </label>

          <Button
            onClick={handleConfirm}
            disabled={status === "saving" || status === "wishlisting"}
            className="mt-4 inline-flex w-full items-center justify-center gap-2"
          >
            <IconPlus size={18} />
            {status === "saving" ? "Saving…" : "Track this product"}
          </Button>
          <p className="mt-1 text-center text-xs text-ink-faint">
            Watches the price and alerts you when it drops.
          </p>
          <Button
            variant="secondary"
            onClick={handleSaveToWishlist}
            disabled={status === "saving" || status === "wishlisting"}
            className="mt-3 inline-flex w-full items-center justify-center gap-2"
          >
            <IconHeart size={16} />
            {status === "wishlisting" ? "Saving…" : "Save to wishlist (don't track yet)"}
          </Button>
          <p className="mt-1 text-center text-xs text-ink-faint">
            Just saves it for later — no price checks, no alerts, until you track it.
          </p>
        </Card>
      )}
    </section>
  );
}
