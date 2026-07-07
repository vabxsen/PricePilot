import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/** The (still non-standard) beforeinstallprompt event, typed minimally. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

interface PwaInstallState {
  /** App is running in standalone/installed mode. */
  installed: boolean;
  /** The browser fired `beforeinstallprompt` and we can offer it. */
  canInstall: boolean;
  /** Triggers the native install prompt. */
  promptInstall: () => Promise<void>;
}

const PwaInstallContext = createContext<PwaInstallState>({
  installed: false,
  canInstall: false,
  promptInstall: async () => {},
});

/**
 * Mounted once at the app root (see main.tsx) — deliberately NOT a
 * per-component hook. `beforeinstallprompt` fires at most once per page
 * load, often within the first few seconds, well before a user would
 * navigate all the way to Settings. A listener that only attaches once the
 * Settings page happens to mount misses that event permanently for the
 * rest of the session (this was the bug: the Install button looked broken
 * because it never had a chance to hear the event fire). Listening from the
 * very first paint means it's captured no matter which page loads first.
 */
export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }
    const mq = window.matchMedia("(display-mode: standalone)");
    const onDisplayChange = () => setInstalled(isStandalone());

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    mq.addEventListener?.("change", onDisplayChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  async function promptInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  return (
    <PwaInstallContext.Provider value={{ installed, canInstall: !!promptEvent, promptInstall }}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall(): PwaInstallState {
  return useContext(PwaInstallContext);
}
