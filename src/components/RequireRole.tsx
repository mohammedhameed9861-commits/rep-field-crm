import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/types/database";
import { FullScreenLoader } from "@/components/FullScreenLoader";

export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <FullScreenLoader />;
  if (profile.role !== role) {
    return <Navigate to={profile.role === "manager" ? "/dashboard/overview" : "/visit/new"} replace />;
  }
  return <>{children}</>;
}
