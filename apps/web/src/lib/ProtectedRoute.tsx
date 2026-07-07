import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { AppLoader } from "../components/AppLoader.js";
import { useAuth } from "./auth.js";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <AppLoader />;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
