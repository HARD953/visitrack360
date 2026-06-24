"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { login as apiLogin, logout as apiLogout, getUserFromStorage } from "@/lib/api/auth";
import type { UserData } from "@/lib/api/auth";

interface AuthContextValue {
  user: UserData | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Recharger l'utilisateur depuis localStorage au montage (hydratation)
  useEffect(() => {
    const stored = getUserFromStorage();
    setUser(stored);
    setIsLoading(false);
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const data = await apiLogin(email, password);
    setUser(data.user);
    router.push("/dashboard-executif");
  }

  function logout(): void {
    apiLogout();
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}