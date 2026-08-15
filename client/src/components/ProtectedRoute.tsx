import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/sign-in" replace />;

  return <Outlet />;
}
