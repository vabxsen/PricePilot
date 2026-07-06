import { Link } from "react-router-dom";
import { ProductCard } from "../components/ProductCard.js";
import { buttonClasses } from "../components/ui/Button.js";
import { useAuth } from "../lib/auth.js";
import { useTrackerList } from "../lib/trackers.js";

export function Dashboard() {
  const { user } = useAuth();
  const { trackers, loading } = useTrackerList(user?.uid);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Your watchlist</h1>
        <Link to="/add" className={buttonClasses("primary", "md")}>
          + Track a product
        </Link>
      </div>

      {loading && <p className="mt-8 text-ink-faint">Loading…</p>}

      {!loading && trackers.length === 0 && (
        <div className="mt-12 rounded-lg border border-dashed border-border/15 p-12 text-center">
          <p className="text-ink-muted">You're not tracking anything yet.</p>
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
