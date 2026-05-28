"use client";

import { useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useNotifPrefs, useUpdateNotifPrefs, type NotifPrefs } from "@/lib/queries";

export function NotificationsPanel() {
  const { data: prefs, isLoading } = useNotifPrefs();
  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  }
  return <NotifBody key={prefs?.user_id ?? "new"} prefs={prefs} />;
}

function NotifBody({ prefs }: { prefs: NotifPrefs | null | undefined }) {
  const update = useUpdateNotifPrefs();
  const supabase = createClient();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [registering, setRegistering] = useState(false);

  async function handleEnable() {
    if (typeof Notification === "undefined") {
      toast.error("Notifications non supportées sur ce navigateur");
      return;
    }
    setRegistering(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Permission refusée");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) {
        toast.warning(
          "Clés VAPID non configurées. Service worker enregistré, push désactivé.",
        );
        await update.mutateAsync({ push_enabled: true });
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) throw new Error("Non authentifié");
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
      if (error) throw error;
      await update.mutateAsync({ push_enabled: true });
      toast.success("Notifications activées sur cet appareil");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setRegistering(false);
    }
  }

  async function handleDisable() {
    try {
      await update.mutateAsync({ push_enabled: false });
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
      toast.success("Notifications désactivées");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  const enabled = prefs?.push_enabled && permission === "granted";

  return (
    <section className="flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${
            enabled ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {enabled ? <Bell className="size-5" /> : <BellOff className="size-5" />}
        </span>
        <div className="flex-1">
          <h2 className="text-base font-semibold">Notifications push</h2>
          <p className="text-sm text-muted-foreground">
            Reçois une notification quand on t&apos;assigne une tâche ou qu&apos;elle
            change de statut. Fonctionne sur mobile (PWA installée).
          </p>
        </div>
        {enabled ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleDisable}
            className="shrink-0"
          >
            Désactiver
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleEnable}
            disabled={registering}
            className="shrink-0 bg-primary text-white hover:bg-primary/90"
          >
            {registering ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Bell className="size-3.5" />
            )}
            Activer
          </Button>
        )}
      </div>

      {permission === "denied" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          Le navigateur a bloqué les notifications. Réactive-les dans les
          paramètres du site.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 border-t pt-5 sm:grid-cols-2">
        <ToggleRow
          label="Quand on m'assigne une tâche"
          checked={prefs?.notify_on_assigned ?? true}
          onChange={(v) => update.mutate({ notify_on_assigned: v })}
        />
        <ToggleRow
          label="Quand le statut change"
          checked={prefs?.notify_on_status_change ?? true}
          onChange={(v) => update.mutate({ notify_on_status_change: v })}
        />
        <ToggleRow
          label="Rappel des tâches dues aujourd'hui"
          checked={prefs?.notify_on_due_today ?? true}
          onChange={(v) => update.mutate({ notify_on_due_today: v })}
        />
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3 hover:bg-muted/30">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-primary"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
