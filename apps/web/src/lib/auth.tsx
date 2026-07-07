import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getAuthClient, getDb } from "./firebase.js";

interface AuthState {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });

async function bootstrapUserDoc(user: User) {
  const ref = doc(getDb(), "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? undefined,
      photoUrl: user.photoURL ?? undefined,
      plan: "free",
      createdAt: Date.now(),
      fcmTokens: [],
      notificationPrefs: { email: true, webPush: false },
    });
  } else if (user.photoURL && snap.data()["photoUrl"] !== user.photoURL) {
    // Keep the Firestore copy of the avatar in sync with the live Google
    // photo on every sign-in. displayName/username/bio are user-editable in
    // Settings and are deliberately left untouched here.
    await setDoc(ref, { photoUrl: user.photoURL }, { merge: true });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const auth = getAuthClient();
    return onAuthStateChanged(auth, async (user) => {
      if (user) await bootstrapUserDoc(user);
      setState({ user, loading: false });
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(getAuthClient(), new GoogleAuthProvider());
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(getAuthClient(), email, password);
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getAuthClient(), email, password);
}

export async function signOutUser(): Promise<void> {
  await signOut(getAuthClient());
}
