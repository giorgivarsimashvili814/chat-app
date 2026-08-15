import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SpinnerWithMessage } from "@/components/SpinnerWithMessage";
import { Button } from "@/components/ui/button";

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (isLoading) return;
    if (errorParam) return;

    navigate(user ? "/" : "/sign-in", { replace: true });
  }, [isLoading, user, errorParam]);

  if (errorParam) {
    return (
      <div>
        <p role="alert">{errorParam}</p>
        <Button variant="link" onClick={() => navigate("/sign-in")}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return <SpinnerWithMessage message="Signing you in..." />;
}
