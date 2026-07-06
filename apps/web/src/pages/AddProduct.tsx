import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { Input } from "../components/ui/Input.js";
import { useAuth } from "../lib/auth.js";
import { resolveProductUrl, type ResolvedProduct } from "../lib/resolver.js";
import { addTrackerForProduct } from "../lib/trackers.js";

export function AddProduct() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initialUrl = (location.state as { url?: string } | null)?.url ?? "";
  const [url, setUrl] = useState(initialUrl);
  const [preview, setPreview] = useState<ResolvedProduct | null>(null);
  const [status, setStatus] = useState<"idle" | "resolving" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleResolve(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPreview(null);
    setStatus("resolving");
    try {
      const resolved = await resolveProductUrl(url);
      setPreview(resolved);
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
      const result = await addTrackerForProduct(user.uid, preview);
      navigate(`/product/${result.productId}`);
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

      {error && <p className="mt-3 text-sm text-brand">{error}</p>}

      {preview && (
        <Card className="mt-6">
          <div className="flex gap-4">
            {preview.imageUrl && (
              <img src={preview.imageUrl} alt="" className="h-20 w-20 rounded-md object-cover" />
            )}
            <div className="flex-1">
              <div className="font-medium text-ink">{preview.title ?? "Untitled product"}</div>
              <div className="text-sm text-ink-faint">{preview.retailer}</div>
              <div className="tabular mt-1 text-xl font-semibold text-ink">
                {preview.price !== null
                  ? new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: preview.currency ?? "USD",
                    }).format(preview.price)
                  : "Price unavailable"}
              </div>
            </div>
          </div>

          {preview.price === null && (
            <p className="mt-3 text-sm text-warning">
              We couldn't detect a price on this page. You can still track it — we'll keep checking.
            </p>
          )}

          <Button onClick={handleConfirm} disabled={status === "saving"} className="mt-4 w-full">
            {status === "saving" ? "Saving…" : "Track this product"}
          </Button>
        </Card>
      )}
    </section>
  );
}
