"use client";

import { useState, useSyncExternalStore } from "react";
import { Bell, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  enablePush,
  pushSupported,
  isIOS,
  isStandalone,
  PushError,
} from "@/lib/push";

const DISMISS_KEY = "oravec:push-prompt-dismissed";

// Hydratation : false côté serveur, true une fois monté côté client.
// Évite tout setState dans un effet (cf. CLAUDE.md, pureté React 19).
function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * Bandeau mobile incitant à activer les notifications push. S'affiche au-dessus
 * de la barre basse, uniquement si le push est supporté, non encore autorisé et
 * non rejeté par l'utilisateur. Sur iPhone hors PWA, guide vers l'installation.
 */
export function NotificationPrompt() {
  const hydrated = useHydrated();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!hydrated || dismissed || done) return null;
  if (!pushSupported()) return null;
  if (localStorage.getItem(DISMISS_KEY) === "1") return null;
  if (Notification.permission !== "default") return null;

  const iosNeedsInstall = isIOS() && !isStandalone();

  function close() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  async function activate() {
    setBusy(true);
    try {
      const perm = await enablePush();
      if (perm === "granted") {
        toast.success("Notifications activées");
        setDone(true);
      } else {
        toast.error("Permission refusée");
        close();
      }
    } catch (err) {
      toast.warning(err instanceof PushError ? err.message : "Activation impossible");
      if (!(err instanceof PushError)) close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-x-0 bottom-16 z-40 px-3 md:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.25rem)" }}
    >
      <div className="flex items-start gap-3 rounded-2xl border bg-card p-3 shadow-lg">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Bell className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Activer les notifications</p>
          {iosNeedsInstall ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Sur iPhone : appuie sur Partager, puis « Sur l&apos;écran d&apos;accueil »
              pour installer l&apos;app et recevoir les alertes.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Sois prévenu quand on t&apos;assigne une tâche ou qu&apos;une échéance
              approche.
            </p>
          )}
          {!iosNeedsInstall && (
            <button
              type="button"
              onClick={activate}
              disabled={busy}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Bell className="size-3.5" />}
              Activer
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Fermer"
          className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
