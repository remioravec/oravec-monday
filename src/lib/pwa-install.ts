"use client";

import { useSyncExternalStore } from "react";

/** Événement non standard émis par Chromium quand la PWA est installable. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Capture l'événement le plus tôt possible (au chargement du bundle client).
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Expose l'état d'installabilité de la PWA et une fonction `install()` qui
 * déclenche l'invite native du navigateur (Chromium/Android). Renvoie
 * `canInstall=false` là où l'invite n'existe pas (iOS, Firefox, déjà installé).
 */
export function usePwaInstall() {
  const canInstall = useSyncExternalStore(
    subscribe,
    () => deferred !== null && !installed,
    () => false,
  );

  async function install(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!deferred) return "unavailable";
    await deferred.prompt();
    const choice = await deferred.userChoice;
    deferred = null;
    emit();
    return choice.outcome;
  }

  return { canInstall, install };
}
