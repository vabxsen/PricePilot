import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { Input, Textarea } from "../components/ui/Input.js";
import { useAuth } from "../lib/auth.js";
import { updateUserProfile, useUserProfile } from "../lib/profile.js";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

export function Settings() {
  const { user } = useAuth();
  const { profile, loading } = useUserProfile(user?.uid);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setStatus("saving");
    setError(null);
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
      });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setError((err as Error).message);
      setStatus("idle");
    }
  }

  if (loading) return <p className="text-ink-faint">Loading…</p>;

  const initial = (displayName || user?.email || "?").charAt(0).toUpperCase();

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-ink">Settings</h1>
      <p className="mt-2 text-ink-muted">Manage your account information.</p>

      <Card className="mt-6 flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface-raised text-xl font-semibold text-ink">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="truncate font-medium text-ink">{user?.email}</div>
          <div className="text-xs text-ink-faint">Signed in</div>
        </div>
      </Card>

      <form onSubmit={handleSave} className="mt-6 space-y-4">
        <Card className="space-y-4">
          <Field label="Name">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
            />
          </Field>
          <Field label="Username">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
              placeholder="username"
              maxLength={30}
            />
          </Field>
          <Field label="Bio">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short bio…"
              maxLength={280}
              rows={3}
            />
            <div className="mt-1 text-right text-xs text-ink-faint">{bio.length}/280</div>
          </Field>
        </Card>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save changes"}
        </Button>
      </form>
    </section>
  );
}
