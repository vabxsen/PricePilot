import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.js";
import { Input, Textarea } from "../components/ui/Input.js";
import { Switch } from "../components/ui/Switch.js";
import {
  IconBell,
  IconCheck,
  IconDownload,
  IconLogout,
  IconUser,
} from "../components/ui/icons.js";
import { signOutUser, useAuth } from "../lib/auth.js";
import { usePwaInstall } from "../lib/pwa.js";
import { updateNotificationPrefs, updateUserProfile, useUserProfile } from "../lib/profile.js";

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">
      <span className="text-ink-muted">{icon}</span>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onChange,
  label,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="text-xs text-ink-faint">{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export function Settings() {
  const { user } = useAuth();
  const { profile, loading } = useUserProfile(user?.uid);
  const { installed, canInstall, promptInstall } = usePwaInstall();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

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

  async function toggleEmail(v: boolean) {
    if (user) await updateNotificationPrefs(user.uid, { email: v });
  }
  async function toggleWebPush(v: boolean) {
    if (user) await updateNotificationPrefs(user.uid, { webPush: v });
  }

  if (loading) return <p className="text-ink-faint">Loading…</p>;

  const initial = (displayName || user?.email || "?").charAt(0).toUpperCase();
  const emailAlerts = profile?.notificationPrefs?.email ?? true;
  const webPush = profile?.notificationPrefs?.webPush ?? false;
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <section className="mx-auto max-w-2xl animate-fade-up">
      <h1 className="text-2xl font-bold text-ink">Settings</h1>
      <p className="mt-1 text-sm text-ink-muted">Manage your profile, alerts, and account.</p>

      {/* Profile header */}
      <Card className="mt-6 flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand/15 text-2xl font-semibold text-brand">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold text-ink">
            {displayName || username || "Your profile"}
          </div>
          <div className="truncate text-sm text-ink-muted">{user?.email}</div>
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-xs text-ink-faint">
            <span className="capitalize">{profile?.plan ?? "free"}</span> plan
          </div>
        </div>
      </Card>

      {/* Editable profile info */}
      <div className="mt-8">
        <SectionTitle icon={<IconUser size={16} />}>Profile information</SectionTitle>
        <form onSubmit={handleSave} className="space-y-4">
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

          <Button type="submit" disabled={status === "saving"} className="inline-flex items-center gap-2">
            {status === "saved" && <IconCheck size={16} />}
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save changes"}
          </Button>
        </form>
      </div>

      {/* App settings */}
      <div className="mt-8">
        <SectionTitle icon={<IconBell size={16} />}>Alerts &amp; app</SectionTitle>
        <Card className="divide-y divide-border/10">
          <div className="pb-3">
            <ToggleRow
              title="Email alerts"
              desc="Get an email when a tracked price drops."
              checked={emailAlerts}
              onChange={toggleEmail}
              label="Toggle email alerts"
            />
          </div>
          <div className="py-3">
            <ToggleRow
              title="Web push"
              desc="Push notifications in your browser (coming soon)."
              checked={webPush}
              onChange={toggleWebPush}
              label="Toggle web push"
            />
          </div>
          <div className="flex items-center justify-between gap-4 pt-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink">Install app</div>
              <div className="text-xs text-ink-faint">
                {installed
                  ? "PricePilot is installed on this device."
                  : "Add PricePilot to your home screen for a native feel."}
              </div>
            </div>
            {installed ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/15 px-2.5 py-1 text-xs font-medium text-brand">
                <IconCheck size={14} /> Installed
              </span>
            ) : canInstall ? (
              <Button
                variant="secondary"
                onClick={promptInstall}
                className="inline-flex shrink-0 items-center gap-2"
              >
                <IconDownload size={16} /> Install
              </Button>
            ) : (
              <span className="shrink-0 text-xs text-ink-faint">Not available</span>
            )}
          </div>
        </Card>
      </div>

      {/* Account */}
      <div className="mt-8">
        <SectionTitle icon={<IconUser size={16} />}>Account</SectionTitle>
        <Card className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Email</span>
            <span className="truncate pl-4 text-ink">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Plan</span>
            <span className="capitalize text-ink">{profile?.plan ?? "free"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Member since</span>
            <span className="text-ink">{memberSince}</span>
          </div>
          <div className="border-t border-border/10 pt-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmingSignOut(true)}
              className="inline-flex items-center gap-2 text-danger"
            >
              <IconLogout size={16} /> Log out
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmingSignOut}
        title="Log out?"
        description="You'll need to sign in again to see your tracked products."
        confirmLabel="Log out"
        onConfirm={() => {
          setConfirmingSignOut(false);
          signOutUser();
        }}
        onCancel={() => setConfirmingSignOut(false)}
      />

      {/* Credits */}
      <div className="mt-8 pb-4 text-center text-xs text-ink-faint">
        <div className="font-medium text-ink-muted">PricePilot</div>
        <div className="mt-1">Never overpay again · Built on Firebase + Cloudflare</div>
        <div className="mt-1">© {new Date().getFullYear()} PricePilot</div>
      </div>
    </section>
  );
}
