import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserCredential } from "firebase/auth";
import type { Account } from "../types";
import { ApiError, api, isOfflineError } from "../lib/api";
import { demoAdmin, demoUser } from "../lib/demo";
import {
  FIREBASE_SESSION_MARKER, firebaseActionSettings, firebaseErrorMessage, firebaseReady,
  getFirebaseAuth, getGoogleProvider
} from "../lib/firebase";

interface AuthValue {
  user: Account | null;
  loading: boolean;
  offline: boolean;
  isStaff: boolean;
  isMaster: boolean;
  login: (email: string, password: string) => Promise<Account>;
  register: (payload: { email: string; password: string; displayName: string; referralCode?: string; marketingOptIn?: boolean }) => Promise<Account>;
  loginWithGoogle: () => Promise<Account>;
  requestPasswordReset: (email: string) => Promise<{ mode: "firebase" | "legacy"; message: string }>;
  sendVerificationEmail: () => Promise<void>;
  refreshEmailVerification: () => Promise<Account>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<Account>) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const SEEDED_EMAIL = /@(19xbet365\.test|example\.com)$/i;

function firebaseCredentialMiss(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  return ["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(code);
}

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
        if (data.user) {
          setUser(data.user);
        } else if (window.localStorage.getItem(FIREBASE_SESSION_MARKER) === "1") {
          const auth = await getFirebaseAuth();
          if (auth) await auth.authStateReady();
          if (auth?.currentUser) {
            try {
              const token = await auth.currentUser.getIdToken();
              const secured = await api.firebaseLogin(token);
              setUser(secured.user);
            } catch (error) {
              if (error instanceof ApiError && (error.status === 401 || error.status === 403)) window.localStorage.removeItem(FIREBASE_SESSION_MARKER);
              if (isOfflineError(error)) setOffline(true);
            }
          } else {
            window.localStorage.removeItem(FIREBASE_SESSION_MARKER);
          }
        }
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
    const normalized = email.trim().toLowerCase();
    if (firebaseReady && normalized.includes("@") && !SEEDED_EMAIL.test(normalized)) {
      try {
        const auth = await getFirebaseAuth();
        if (auth) {
          const { signInWithEmailAndPassword } = await import("firebase/auth");
          const credential = await signInWithEmailAndPassword(auth, normalized, password);
          const data = await api.firebaseLogin(await credential.user.getIdToken());
          window.localStorage.setItem(FIREBASE_SESSION_MARKER, "1");
          setUser(data.user);
          setOffline(false);
          return data.user;
        }
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (!firebaseCredentialMiss(error)) throw new Error(firebaseErrorMessage(error));
      }
    }

    try {
      const data = await api.login(email, password);
      setUser(data.user);
      setOffline(false);
      return data.user;
    } catch (error) {
      if (isOfflineError(error) && password.length >= 6) {
        const demo = normalized.includes("admin") || normalized.includes("staff") ? demoAdmin : demoUser;
        const fallback = { ...demo, email: normalized || demo.email, lastLoginAt: new Date().toISOString() };
        setUser(fallback);
        setOffline(true);
        return fallback;
      }
      throw error;
    }
  }, []);

  const register = useCallback(async (payload: {
    email: string; password: string; displayName: string; referralCode?: string; marketingOptIn?: boolean;
  }) => {
    const normalized = payload.email.trim().toLowerCase();
    if (firebaseReady && normalized.includes("@") && !SEEDED_EMAIL.test(normalized)) {
      let credential: UserCredential | undefined;
      const auth = await getFirebaseAuth();
      try {
        if (auth) {
          const { createUserWithEmailAndPassword } = await import("firebase/auth");
          credential = await createUserWithEmailAndPassword(auth, normalized, payload.password);
        }
      } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
        if (code === "auth/email-already-in-use" && auth) {
          try {
            const { signInWithEmailAndPassword } = await import("firebase/auth");
            credential = await signInWithEmailAndPassword(auth, normalized, payload.password);
          } catch {
            throw new Error("An account with this email already exists. Sign in instead.");
          }
        } else {
          throw new Error(firebaseErrorMessage(error));
        }
      }
      if (credential) {
        const { sendEmailVerification, updateProfile } = await import("firebase/auth");
        await updateProfile(credential.user, { displayName: payload.displayName }).catch(() => {});
        await sendEmailVerification(credential.user, firebaseActionSettings()).catch(() => {});
        const data = await api.firebaseLogin(await credential.user.getIdToken(), {
          displayName: payload.displayName,
          referralCode: payload.referralCode,
          marketingOptIn: payload.marketingOptIn
        });
        window.localStorage.setItem(FIREBASE_SESSION_MARKER, "1");
        setUser(data.user);
        setOffline(false);
        return data.user;
      }
    }

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

  const loginWithGoogle = useCallback(async () => {
    const auth = await getFirebaseAuth();
    const provider = await getGoogleProvider();
    if (!auth || !provider) {
      throw new Error("Google sign-in is not enabled for this Firebase project.");
    }
    try {
      const { signInWithPopup } = await import("firebase/auth");
      const credential = await signInWithPopup(auth, provider);
      const data = await api.firebaseLogin(await credential.user.getIdToken());
      window.localStorage.setItem(FIREBASE_SESSION_MARKER, "1");
      setUser(data.user);
      setOffline(false);
      return data.user;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error(firebaseErrorMessage(error));
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (firebaseReady && normalized.includes("@") && !SEEDED_EMAIL.test(normalized)) {
      try {
        const auth = await getFirebaseAuth();
        if (auth) {
          const { sendPasswordResetEmail } = await import("firebase/auth");
          await sendPasswordResetEmail(auth, normalized, { url: firebaseActionSettings().url });
          return { mode: "firebase" as const, message: "If that email is registered, Firebase will send a secure reset link." };
        }
      } catch (error) {
        if (!firebaseCredentialMiss(error)) throw new Error(firebaseErrorMessage(error));
      }
    }
    await api.forgotPassword(normalized);
    return { mode: "legacy" as const, message: "If that email is registered, reset instructions will appear in your account notifications." };
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    const auth = await getFirebaseAuth();
    if (!auth?.currentUser) throw new Error("Sign in with Firebase to verify your email.");
    const { sendEmailVerification } = await import("firebase/auth");
    try {
      await sendEmailVerification(auth.currentUser, firebaseActionSettings());
    } catch (error) {
      throw new Error(firebaseErrorMessage(error));
    }
  }, []);

  const refreshEmailVerification = useCallback(async () => {
    const auth = await getFirebaseAuth();
    if (!auth?.currentUser) throw new Error("Sign in with Firebase to verify your email.");
    await auth.currentUser.reload();
    if (!auth.currentUser.emailVerified) {
      throw new Error("Your email is not verified yet. Open the link we sent, then try again.");
    }
    const data = await api.firebaseLogin(await auth.currentUser.getIdToken(true));
    window.localStorage.setItem(FIREBASE_SESSION_MARKER, "1");
    setUser(data.user);
    setOffline(false);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    if (window.localStorage.getItem(FIREBASE_SESSION_MARKER) === "1") {
      const auth = await getFirebaseAuth();
      if (auth?.currentUser) {
        const { signOut } = await import("firebase/auth");
        await signOut(auth).catch(() => {});
      }
      window.localStorage.removeItem(FIREBASE_SESSION_MARKER);
    }
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
    login, register, loginWithGoogle, requestPasswordReset, sendVerificationEmail, refreshEmailVerification,
    logout, updateUser, refresh
  }), [
    user, loading, offline, login, register, loginWithGoogle, requestPasswordReset,
    sendVerificationEmail, refreshEmailVerification, logout, updateUser, refresh
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
