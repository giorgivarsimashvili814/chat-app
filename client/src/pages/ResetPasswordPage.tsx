import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "At least 8 characters"),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordFormValues) {
    if (!token) {
      setError("root", { message: "Missing reset token" });
      return;
    }

    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: data.newPassword,
      });
      navigate("/sign-in");
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || "Something went wrong"
        : "Something went wrong";
      setError("root", { message });
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Invalid link</CardTitle>
          <CardDescription>
            This password reset link is invalid or missing a token.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="link"
            className="w-full"
            render={<Link to="/sign-in" />}
          >
            Back to sign in
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} id="reset-password-form">
          <div className="grid gap-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">
                {errors.newPassword.message}
              </p>
            )}
            {errors.root && (
              <p className="text-sm text-destructive" role="alert">
                {errors.root.message}
              </p>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button
          type="submit"
          form="reset-password-form"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Resetting..." : "Reset password"}
        </Button>
        <Button
          variant="link"
          className="w-full"
          render={<Link to="/sign-in" />}
        >
          Back to sign in
        </Button>
      </CardFooter>
    </Card>
  );
}
