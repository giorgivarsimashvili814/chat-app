import { Spinner } from "@/components/ui/spinner";

export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-4">
      <Spinner className="size-6" />
    </div>
  );
}
