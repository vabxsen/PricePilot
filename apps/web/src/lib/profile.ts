import { UserDoc } from "@pricepilot/shared";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
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
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserDoc, "displayName" | "username" | "bio">>,
): Promise<void> {
  await setDoc(doc(getDb(), "users", uid), updates, { merge: true });
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
