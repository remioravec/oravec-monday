"use client";

import { useState } from "react";
import { CalendarDays, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { GOOGLE_SCOPES } from "@/lib/google/scopes";
import { Button } from "@/components/ui/button";
import {
  useGoogleCalendars,
  useUpdateGoogleCalendars,
} from "@/lib/queries";

export function GoogleCalendarsPanel() {
  const { data, isLoading, refetch, isFetching } = useGoogleCalendars();
  const update = useUpdateGoogleCalendars();
  const [connecting, setConnecting] = useState(false);

  async function connect() {
    setConnecting(true);
    try {
      const supabase = createClient();
      // linkIdentity rattache Google au compte courant ; fallback signInWithOAuth.
      const options = {
        scopes: GOOGLE_SCOPES,
        redirectTo: `${window.location.origin}/auth/callback?next=/app/settings/profile`,
        queryParams: { access_type: "offline", prompt: "consent" },
      } as const;
      const linkable = supabase.auth as unknown as {
        linkIdentity?: (a: { provider: "google"; options: typeof options }) => Promise<{ error: unknown }>;
      };
      if (linkable.linkIdentity) {
        const { error } = await linkable.linkIdentity({ provider: "google", options });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options });
        if (error) throw error;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connexion Google échouée");
      setConnecting(false);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Chargement…
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="size-4 text-blue-600" />
          Google Agenda
        </h3>
        {data?.connected && (
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={"size-3.5 " + (isFetching ? "animate-spin" : "")} />
            Rafraîchir
          </button>
        )}
      </header>

      {!data?.connected ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            Connecte ton compte Google pour afficher tes agendas, voir tes
            disponibilités et synchroniser tes tâches datées.
          </p>
          <Button onClick={connect} disabled={connecting} className="bg-blue-600 text-white hover:bg-blue-700">
            {connecting ? "Redirection…" : "Connecter Google"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {data.email && (
            <p className="text-xs text-muted-foreground">
              Connecté : <span className="font-medium text-foreground">{data.email}</span>
            </p>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Agendas affichés (disponibilités)
            </p>
            <ul className="flex flex-col gap-1.5">
              {data.calendars.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`cal-${c.id}`}
                    checked={c.selected}
                    onChange={(e) =>
                      update.mutate({ selected: { [c.google_calendar_id]: e.target.checked } })
                    }
                    className="size-4 accent-blue-600"
                  />
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: c.bg_color ?? "#9ca3af" }}
                  />
                  <label htmlFor={`cal-${c.id}`} className="flex-1 truncate text-sm">
                    {c.summary ?? c.google_calendar_id}
                  </label>
                </li>
              ))}
              {data.calendars.length === 0 && (
                <li className="text-xs italic text-muted-foreground">Aucun agenda trouvé.</li>
              )}
            </ul>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Agenda où créer les tâches
            </label>
            <select
              value={data.writeCalendarId ?? ""}
              onChange={(e) => update.mutate({ writeCalendarId: e.target.value || null })}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none"
            >
              <option value="">Agenda principal (primary)</option>
              {data.calendars.map((c) => (
                <option key={c.id} value={c.google_calendar_id}>
                  {c.summary ?? c.google_calendar_id}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </section>
  );
}
