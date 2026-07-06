import { Link, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./lib/ProtectedRoute.js";
import { signOutUser, useAuth } from "./lib/auth.js";
import { AddProduct } from "./pages/AddProduct.js";
import { Dashboard } from "./pages/Dashboard.js";
import { Landing } from "./pages/Landing.js";
import { Login } from "./pages/Login.js";
import { ProductDetail } from "./pages/ProductDetail.js";

function Nav() {
  const { user } = useAuth();

  return (
    <header className="border-b border-border/10 bg-bg/80 backdrop-blur supports-[backdrop-filter]:bg-bg/60 sticky top-0 z-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-bg shadow-glow">
            ✈
          </span>
          <span className="text-lg tracking-tight">PricePilot</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {user ? (
            <>
              <Link to="/dashboard" className="text-ink-muted transition hover:text-ink">
                Dashboard
              </Link>
              <Link to="/add" className="text-ink-muted transition hover:text-ink">
                Add product
              </Link>
              <button
                onClick={() => signOutUser()}
                className="text-ink-faint transition hover:text-ink-muted"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-md bg-brand px-3 py-1.5 font-medium text-bg transition hover:bg-brand-hover"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function App() {
  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add"
            element={
              <ProtectedRoute>
                <AddProduct />
              </ProtectedRoute>
            }
          />
          <Route
            path="/product/:productId"
            element={
              <ProtectedRoute>
                <ProductDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <footer className="border-t border-border/10 px-4 py-6 text-center text-sm text-ink-faint">
        PricePilot
      </footer>
    </div>
  );
}
