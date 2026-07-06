import { computeStats } from "@pricepilot/shared";
import { useNavigate, useParams } from "react-router-dom";
import { PriceChart } from "../components/PriceChart.js";
import { StatTile } from "../components/StatTile.js";
import { useAuth } from "../lib/auth.js";
import { removeTracker, useProduct, useProductHistory, useTrackerList } from "../lib/trackers.js";

export function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { product, loading } = useProduct(productId);
  const { history } = useProductHistory(productId);
  const { trackers } = useTrackerList(user?.uid);

  const tracker = trackers.find((t) => t.productId === productId);
  const stats = computeStats(history);

  if (loading) return <p className="text-black/40 dark:text-white/40">Loading…</p>;
  if (!product) return <p className="text-black/40 dark:text-white/40">Product not found.</p>;

  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: product.currency });

  async function handleUntrack() {
    if (!user || !tracker || !product) return;
    await removeTracker(user.uid, tracker.id, product.id);
    navigate("/dashboard");
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          {product.imageUrl && (
            <img src={product.imageUrl} alt="" className="h-24 w-24 rounded-lg object-cover" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{product.title}</h1>
            <p className="text-black/50 dark:text-white/50">{product.retailer}</p>
            <p className="tabular mt-1 text-3xl font-semibold">
              {product.currentPrice !== null ? fmt.format(product.currentPrice) : "—"}
            </p>
            {!product.inStock && (
              <span className="mt-1 inline-block rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                Out of stock
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-brand px-5 py-3 text-center font-medium text-white hover:opacity-90"
          >
            Buy at {product.retailer} →
          </a>
          {tracker && (
            <button
              onClick={handleUntrack}
              className="text-sm text-black/50 hover:text-danger dark:text-white/50"
            >
              Stop tracking
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Lowest ever" value={fmt.format(stats.min)} />
          <StatTile label="Highest ever" value={fmt.format(stats.max)} />
          <StatTile label="Average" value={fmt.format(stats.avg)} />
          <StatTile label="Deal score" value={`${stats.dealScore}/100`} />
        </div>
      )}

      <div className="mt-6">
        <PriceChart history={history} currency={product.currency} />
      </div>
    </section>
  );
}
