import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <main className="flex items-center justify-center min-h-screen w-full p-4">
      <Outlet />
    </main>
  );
}
