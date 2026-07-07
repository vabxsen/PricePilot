import { UserDoc } from "@pricepilot/shared";
import { doc, getDoc, onSnapshot, runTransaction, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getDb } from "./firebase.js";

/** Live users/{uid} doc — the Firestore profile, distinct from the Firebase Auth user object. */
export function useUserProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const ref = doc(getDb(), "users", uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setProfile(null);
      } else {
        const result = UserDoc.safeParse({ uid: snap.id, ...snap.data() });
        setProfile(result.success ? result.data : null);
      }
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return { profile, loading };
}

/**
 * Always writes the trimmed value as-is (never undefined) — sending an
 * actual empty string is what lets a user clear a field. Converting to
 * undefined here would silently no-op under ignoreUndefinedProperties.
 * Username is deliberately excluded here — it's a one-time, permanent claim
 * handled exclusively by claimUsername() below. Bio isn't editable from the
 * UI at all anymore.
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserDoc, "displayName">>,
): Promise<void> {
  await setDoc(doc(getDb(), "users", uid), updates, { merge: true });
}

const USERNAME_FORMAT = /^[a-z0-9_]{3,20}$/;

/** Lowercase, trimmed key used for global uniqueness (case-insensitive). */
function usernameKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsernameFormat(raw: string): boolean {
  return USERNAME_FORMAT.test(usernameKey(raw));
}

/**
 * Fast, non-authoritative check for live UI feedback while typing. Two
 * people can still race to claim the same name between this check and
 * claimUsername() — the transaction there is the real, atomic gate.
 */
export async function isUsernameAvailable(raw: string): Promise<boolean> {
  const key = usernameKey(raw);
  if (!USERNAME_FORMAT.test(key)) return false;
  const snap = await getDoc(doc(getDb(), "usernames", key));
  return !snap.exists();
}

/**
 * Permanently claims a username for this account. Can only ever succeed
 * once per account — both here (checks the account doesn't already have
 * one) and in Firestore rules (the usernames/{key} doc can only ever be
 * created once, and users/{uid}.username can't change after it's non-empty).
 * Throws with a user-facing message on any failure to claim.
 */
export async function claimUsername(uid: string, raw: string): Promise<void> {
  const trimmed = raw.trim();
  const key = usernameKey(trimmed);
  if (!USERNAME_FORMAT.test(key)) {
    throw new Error("Usernames must be 3-20 characters: lowercase letters, numbers, and underscores.");
  }

  const db = getDb();
  const usernameRef = doc(db, "usernames", key);
  const userRef = doc(db, "users", uid);

  await runTransaction(db, async (t) => {
    const [usernameSnap, userSnap] = await Promise.all([t.get(usernameRef), t.get(userRef)]);
    if (usernameSnap.exists()) {
      throw new Error("Username is already taken.");
    }
    const existing = (userSnap.data()?.["username"] as string | undefined) ?? "";
    if (existing.trim() !== "") {
      throw new Error("You already have a username — it can't be changed.");
    }
    t.set(usernameRef, { uid, createdAt: Date.now() });
    t.set(userRef, { username: trimmed }, { merge: true });
  });
}

/**
 * Merge-writes notification preferences. `setDoc({ merge: true })` deep-merges
 * the nested `notificationPrefs` map, so passing just `{ email }` leaves
 * `webPush` untouched.
 */
export async function updateNotificationPrefs(
  uid: string,
  prefs: Partial<{ email: boolean; webPush: boolean }>,
): Promise<void> {
  await setDoc(doc(getDb(), "users", uid), { notificationPrefs: prefs }, { merge: true });
}
