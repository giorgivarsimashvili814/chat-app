import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";

export function PublicOnlyRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;

  return <Outlet />;
}
