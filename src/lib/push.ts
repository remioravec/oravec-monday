"use client";

import { createClient } from "@/lib/supabase/client";

/** iOS (iPhone/iPad) — le push web n'y fonctionne que depuis une PWA installée. */
export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS se présente comme un Mac tactile.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** L'app tourne-t-elle en mode « installé » (PWA plein écran) ? */
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari expose navigator.standalone (non typé).
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

export class PushError extends Error {}

/**
 * Demande la permission, enregistre le service worker, souscrit au push et
 * persiste l'abonnement côté Supabase. Renvoie la permission obtenue.
 */
export async function enablePush(): Promise<NotificationPermission> {
  if (!pushSupported()) {
    throw new PushError("Notifications non supportées sur ce navigateur");
  }
  // iOS : exiger l'installation en PWA, sinon requestPermission échoue.
  if (isIOS() && !isStandalone()) {
    throw new PushError(
      "Sur iPhone, ajoute d'abord l'app à l'écran d'accueil (Partager → Sur l'écran d'accueil), puis active les notifications depuis l'app installée.",
    );
  }

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm;

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user?.id) throw new PushError("Non authentifié");

  if (!vapid) {
    // SW enregistré mais pas d'abonnement faute de clés serveur.
    throw new PushError(
      "Clés VAPID non configurées côté serveur. Notifications dans l'app seulement.",
    );
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid),
  });
  const json = sub.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: u.user.id,
      endpoint: json.endpoint!,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new PushError(error.message);
  return perm;
}

/** Désabonne l'appareil courant et supprime l'abonnement côté serveur. */
export async function disablePush() {
  if (!pushSupported()) return;
  const supabase = createClient();
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
