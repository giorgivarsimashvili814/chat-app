import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export function HomePage() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome back{user ? `, ${user.username}` : ""}</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Provider</dt>
            <dd>{user?.authProvider}</dd>

            <dt className="text-muted-foreground">Email verified</dt>
            <dd>{user?.emailVerified ? "Yes" : "No"}</dd>
          </dl>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={signOut}>
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
