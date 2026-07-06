import { Link } from "react-router-dom";
import { ProductCard } from "../components/ProductCard.js";
import { useAuth } from "../lib/auth.js";
import { useTrackerList } from "../lib/trackers.js";

export function Dashboard() {
  const { user } = useAuth();
  const { trackers, loading } = useTrackerList(user?.uid);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your watchlist</h1>
        <Link
          to="/add"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Track a product
        </Link>
      </div>

      {loading && <p className="mt-8 text-black/40 dark:text-white/40">Loading…</p>}

      {!loading && trackers.length === 0 && (
        <div className="mt-12 rounded-lg border border-dashed border-black/15 p-12 text-center dark:border-white/15">
          <p className="text-black/60 dark:text-white/60">You're not tracking anything yet.</p>
          <Link to="/add" className="mt-4 inline-block text-brand hover:underline">
            Track your first product →
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trackers.map((tracker) => (
          <ProductCard key={tracker.id} tracker={tracker} />
        ))}
      </div>
    </section>
  );
}
