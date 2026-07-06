import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Initialise the Admin SDK from a service-account JSON provided via the
 * FIREBASE_SERVICE_ACCOUNT env var (stored as a GitHub Actions secret).
 * Returns null when unconfigured so local runs fail loudly but safely.
 */
export function initFirestore(): Firestore | null {
  const raw = process.env["FIREBASE_SERVICE_ACCOUNT"];
  if (!raw) {
    console.error("FIREBASE_SERVICE_ACCOUNT not set — cannot connect to Firestore.");
    return null;
  }
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(raw) as Record<string, string>;
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}
