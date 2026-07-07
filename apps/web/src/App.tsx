import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLoader } from "./components/AppLoader.js";
import { AppShell } from "./components/AppShell.js";
import { ProtectedRoute } from "./lib/ProtectedRoute.js";
import { useAuth } from "./lib/auth.js";
import { AddProduct } from "./pages/AddProduct.js";
import { Charts } from "./pages/Charts.js";
import { Dashboard } from "./pages/Dashboard.js";
import { Login } from "./pages/Login.js";
import { ProductDetail } from "./pages/ProductDetail.js";
import { Products } from "./pages/Products.js";
import { Settings } from "./pages/Settings.js";
import { Wishlist } from "./pages/Wishlist.js";

function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-8">
        {children}
      </main>
    </div>
  );
}

/** Root: skip the marketing page — go straight into the app (or to login). */
function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return <AppLoader />;
  }
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route
        path="/login"
        element={
          <PublicLayout>
            <Login />
          </PublicLayout>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell>
              <Dashboard />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/charts"
        element={
          <ProtectedRoute>
            <AppShell>
              <Charts />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <AppShell>
              <Products />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/wishlist"
        element={
          <ProtectedRoute>
            <AppShell>
              <Wishlist />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/add"
        element={
          <ProtectedRoute>
            <AppShell>
              <AddProduct />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/product/:productId"
        element={
          <ProtectedRoute>
            <AppShell>
              <ProductDetail />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppShell>
              <Settings />
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
