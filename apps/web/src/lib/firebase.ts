import { initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, initializeFirestore, type Firestore } from "firebase/firestore";

/**
 * Client Firebase config comes from Vite env vars (VITE_*), which are safe
 * to expose in the browser — Firestore access is protected by security
 * rules, not by hiding these keys. See .env.example and docs/07-spark-mvp.md.
 *
 * VITE_USE_EMULATORS=true lets the app run entirely against the local
 * Firebase Auth/Firestore emulators with zero real project configured
 * (falls back to a "demo-*" project id, which the emulator accepts as-is).
 */
const useEmulators = import.meta.env.VITE_USE_EMULATORS === "true";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-pricepilot.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (useEmulators ? "demo-pricepilot" : ""),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id",
};

export const isFirebaseConfigured = Boolean(firebaseConfig.projectId);

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  // ignoreUndefinedProperties: optional fields (brand, imageUrl, ...) are
  // often genuinely undefined — Firestore otherwise throws on `undefined`.
  dbInstance = initializeFirestore(app, { ignoreUndefinedProperties: true });

  if (useEmulators) {
    connectAuthEmulator(authInstance, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(dbInstance, "127.0.0.1", 8080);
  }
}

export function getAuthClient(): Auth {
  if (!authInstance) throw new Error("Firebase not configured — set VITE_FIREBASE_* env vars.");
  return authInstance;
}

export function getDb(): Firestore {
  if (!dbInstance) throw new Error("Firebase not configured — set VITE_FIREBASE_* env vars.");
  return dbInstance;
}
