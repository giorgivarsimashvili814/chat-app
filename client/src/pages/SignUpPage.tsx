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

const signUpSchema = z.object({
  email: z.string().email("Enter a valid email"),
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(30, "At most 30 characters")
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, and underscores only"),
  password: z.string().min(8, "At least 8 characters"),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export function SignUpPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  async function onSubmit(data: SignUpFormValues) {
    try {
      await signUp(data.email, data.username, data.password);
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
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your details below to create your account
        </CardDescription>
        <CardAction>
          <Button variant="link" render={<Link to="/sign-in" />}>
            Sign In
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} id="sign-up-form">
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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="cobalt_ferret_4827"
                {...register("username", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toLowerCase();
                  },
                })}
              />
              {errors.username && (
                <p className="text-sm text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
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
          form="sign-up-form"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating account..." : "Sign Up"}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          render={<a href={`${API_URL}/auth/google`} />}
        >
          Sign up with Google
        </Button>
      </CardFooter>
    </Card>
  );
}
