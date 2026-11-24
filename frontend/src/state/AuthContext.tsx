import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Account } from "../types";
import { api, isOfflineError } from "../lib/api";
import { demoAdmin, demoUser } from "../lib/demo";

interface AuthValue {
  user: Account | null;
  loading: boolean;
  offline: boolean;
  isStaff: boolean;
  isMaster: boolean;
  login: (email: string, password: string) => Promise<Account>;
  register: (payload: { email: string; password: string; displayName: string; referralCode?: string; marketingOptIn?: boolean }) => Promise<Account>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<Account>) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.me();
      setUser(data.user);
      setOffline(false);
    } catch (error) {
      if (isOfflineError(error)) setOffline(true);
      setUser((current) => current);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.me();
        setUser(data.user);
      } catch (error) {
        if (isOfflineError(error)) setOffline(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener("19x:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("19x:unauthorized", handleUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await api.login(email, password);
      setUser(data.user);
      setOffline(false);
      return data.user;
    } catch (error) {
      if (isOfflineError(error) && password.length >= 6) {
        const normalized = email.trim().toLowerCase();
        const demo = normalized.includes("admin") || normalized.includes("staff") ? demoAdmin : demoUser;
        const fallback = { ...demo, email: normalized || demo.email, lastLoginAt: new Date().toISOString() };
        setUser(fallback);
        setOffline(true);
        return fallback;
      }
      throw error;
    }
  }, []);

  const register = useCallback(async (payload: { email: string; password: string; displayName: string; referralCode?: string; marketingOptIn?: boolean }) => {
    try {
      const data = await api.register(payload);
      setUser(data.user);
      setOffline(false);
      return data.user;
    } catch (error) {
      if (isOfflineError(error) && payload.password.length >= 8) {
        const fallback: Account = {
          ...demoUser,
          id: `demo-${Date.now()}`,
          email: payload.email.toLowerCase(),
          displayName: payload.displayName,
          username: payload.email.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase().slice(0, 20),
          referralCode: `19X-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          lastLoginAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setUser(fallback);
        setOffline(true);
        return fallback;
      }
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* offline fallback still clears local session */ }
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<Account>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user, loading, offline,
    isStaff: !!user && ["master_admin", "admin", "sub_admin", "agent"].includes(user.role),
    isMaster: user?.role === "master_admin",
    login, register, logout, updateUser, refresh
  }), [user, loading, offline, login, register, logout, updateUser, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
