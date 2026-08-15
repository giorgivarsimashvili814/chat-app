import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { SignInPage } from "@/pages/SignInPage";
import { SignUpPage } from "@/pages/SignUpPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { GoogleCallbackPage } from "@/pages/GoogleCallbackPage";
import { HomePage } from "@/pages/HomePage";
import AuthLayout from "@/layouts/AuthLayout";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/sign-up" element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<GoogleCallbackPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
