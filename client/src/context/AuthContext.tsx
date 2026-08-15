import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { api, setAccessToken } from "@/lib/api";

interface User {
  id: string;
  email: string;
  username: string;
  googleId: string | null;
  authProvider: "LOCAL" | "GOOGLE";
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || fallback;
  }
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  async function tryRestoreSession() {
    try {
      const { data } = await api.post("/auth/refresh");
      setAccessToken(data.accessToken);
      setUser(data.user);
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    tryRestoreSession();
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const { data } = await api.post("/auth/sign-in", { email, password });
      setAccessToken(data.accessToken);
      setUser(data.user);
    } catch (err) {
      throw new Error(extractErrorMessage(err, "Sign in failed"));
    }
  }

  async function signUp(email: string, username: string, password: string) {
    try {
      const { data } = await api.post("/auth/sign-up", {
        email,
        username,
        password,
      });
      setAccessToken(data.accessToken);
      setUser(data.user);
    } catch (err) {
      throw new Error(extractErrorMessage(err, "Sign up failed"));
    }
  }

  async function signOut() {
    try {
      await api.post("/auth/sign-out");
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
