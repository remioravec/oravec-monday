"use client";

import { useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enablePush, disablePush, PushError } from "@/lib/push";
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
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [registering, setRegistering] = useState(false);

  async function handleEnable() {
    setRegistering(true);
    try {
      const perm = await enablePush();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Permission refusée");
        return;
      }
      await update.mutateAsync({ push_enabled: true });
      toast.success("Notifications activées sur cet appareil");
    } catch (err) {
      // Cas particuliers (iOS non installé, VAPID absent) → message guidé.
      if (err instanceof PushError) {
        toast.warning(err.message);
        // SW peut être enregistré sans abonnement : on garde la préf active.
        if (err.message.startsWith("Clés VAPID")) {
          await update.mutateAsync({ push_enabled: true });
        }
      } else {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    } finally {
      setRegistering(false);
    }
  }

  async function handleDisable() {
    try {
      await update.mutateAsync({ push_enabled: false });
      await disablePush();
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
