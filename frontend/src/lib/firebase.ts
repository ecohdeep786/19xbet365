import type { Auth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDwOe2YCKvrhzuxwQnSD_XEF7g23_8iOf8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "xbet365-ab8fb.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "xbet365-ab8fb",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "xbet365-ab8fb.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1079337385097",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1079337385097:web:f4d24b600520555bb0da58",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-F342CYS1YK"
};

export const firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain);
export const googleSignInEnabled = firebaseReady && import.meta.env.VITE_FIREBASE_GOOGLE_ENABLED === "true";
export const FIREBASE_SESSION_MARKER = "19x:firebase-session";

let cachedAuth: Auth | null = null;
let cachedGoogleProvider: GoogleAuthProvider | null = null;

/**
 * Load Firebase Auth only when a player uses a secure identity flow.
 * Public pages therefore keep their original bundle size.
 */
export async function getFirebaseAuth(): Promise<Auth | null> {
  if (!firebaseReady) return null;
  if (cachedAuth) return cachedAuth;
  const [{ getApp, getApps, initializeApp }, { getAuth }] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth")
  ]);
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  cachedAuth = getAuth(app);
  return cachedAuth;
}

export async function getGoogleProvider(): Promise<GoogleAuthProvider | null> {
  if (!googleSignInEnabled) return null;
  if (cachedGoogleProvider) return cachedGoogleProvider;
  const { GoogleAuthProvider } = await import("firebase/auth");
  cachedGoogleProvider = new GoogleAuthProvider();
  return cachedGoogleProvider;
}

export function firebaseActionSettings() {
  const host = window.location.hostname === "127.0.0.1" ? "localhost" : window.location.hostname;
  return {
    url: `${window.location.protocol}//${host}${window.location.port ? `:${window.location.port}` : ""}/?emailVerified=1#/login`,
    handleCodeInApp: false
  };
}

export function firebaseErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Sign in instead.";
    case "auth/weak-password":
      return "Use at least 8 characters with a letter and a number.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many secure sign-in attempts. Wait a few minutes and try again.";
    case "auth/user-disabled":
      return "This secure identity is disabled. Contact support.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before it finished.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled for the Firebase project yet.";
    case "auth/unauthorized-continue-uri":
      return "Add this website domain to the Firebase Authentication authorized domains before sending verification links.";
    case "auth/network-request-failed":
      return "The secure identity service is unreachable. Check your connection and try again.";
    default:
      return "Secure sign-in could not be completed. Try again.";
  }
}
