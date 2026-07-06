import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./auth.js";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <p className="py-20 text-center text-black/40 dark:text-white/40">Loading…</p>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
