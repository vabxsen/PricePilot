import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Client Firebase config comes from Vite env vars (VITE_*), which are safe
 * to expose in the browser — Firestore access is protected by security rules,
 * not by hiding these keys. See .env.example and docs/07-spark-mvp.md.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.projectId);

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
}

/** Throws a clear error if used before env is configured (S1). */
export function getAuthClient(): Auth {
  if (!authInstance) throw new Error("Firebase not configured — set VITE_FIREBASE_* env vars.");
  return authInstance;
}

export function getDb(): Firestore {
  if (!dbInstance) throw new Error("Firebase not configured — set VITE_FIREBASE_* env vars.");
  return dbInstance;
}
