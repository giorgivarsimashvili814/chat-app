import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
  });

  async function onSubmit(data: SignInFormValues) {
    try {
      await signIn(data.email, data.password);
      navigate("/");
    } catch (err) {
      setError("root", {
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in to your account</CardTitle>
        <CardDescription>
          Enter your email below to sign in to your account
        </CardDescription>
        <CardAction>
          <Button variant="link" render={<Link to="/sign-up" />}>
            Sign Up
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} id="sign-in-form">
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
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
          form="sign-in-form"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          render={<a href={`${API_URL}/auth/google`} />}
        >
          Sign in with Google
        </Button>
      </CardFooter>
    </Card>
  );
}
