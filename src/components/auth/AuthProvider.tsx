"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { Plan } from "@/lib/entitlements";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  plan: Plan;
};

type AuthState = {
  user: PublicUser | null;
  loading: boolean;
  refresh: () => Promise<PublicUser | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchMe(): Promise<PublicUser | null> {
  try {
    const r = await fetch("/api/auth/me", { cache: "no-store" });
    const j = (await r.json()) as { user: PublicUser | null };
    return j.user ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const u = await fetchMe();
    setUser(u);
    setLoading(false);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  // Hydrate session on mount (data fetch from an external system).
  useEffect(() => {
    let alive = true;
    fetchMe().then((u) => {
      if (!alive) return;
      setUser(u);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
