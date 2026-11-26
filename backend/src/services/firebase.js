import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID || "xbet365-ab8fb";
let serviceAccount = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} catch {
  console.warn("[firebase] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON; token revocation checks are disabled.");
}

function firebaseApp() {
  if (!getApps().length) {
    initializeApp(serviceAccount ? { credential: cert(serviceAccount), projectId } : { projectId });
  }
  return getApps()[0];
}

export function firebaseProjectId() {
  return projectId;
}

export async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    throw Object.assign(new Error("A Firebase ID token is required."), { status: 400, code: "firebase_token_required" });
  }
  try {
    // Revocation checks need Admin credentials. Token verification itself uses
    // Google's public certificates and works without a service account.
    return await getAuth(firebaseApp()).verifyIdToken(idToken, Boolean(serviceAccount));
  } catch (error) {
    if (error?.code === "auth/id-token-revoked" || error?.code === "auth/user-disabled") {
      throw Object.assign(new Error("This secure identity is no longer active. Sign in again or contact support."), {
        status: 401,
        code: "firebase_identity_revoked"
      });
    }
    throw Object.assign(new Error("Firebase sign-in could not be verified. Sign in again."), {
      status: 401,
      code: "invalid_firebase_token"
    });
  }
}
