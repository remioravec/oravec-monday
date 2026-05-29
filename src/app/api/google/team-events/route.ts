import { NextResponse } from "next/server";
import { requireUser } from "@/lib/google/route-helpers";
import { adminClient, getValidAccessToken, GoogleNotConnectedError } from "@/lib/google/server";
import { listEvents } from "@/lib/google/calendar";

export interface TeamEventDTO {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  personName: string;
  personColor: string;
}

/**
 * Événements (lecture seule) des agendas sélectionnés de TOUS les membres de
 * l'espace (hors soi-même, déjà affiché par l'overlay perso). Permet de voir
 * les disponibilités de l'équipe. Utilise le service_role pour lire le token
 * de chaque membre.
 */
export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const url = new URL(req.url);
  const timeMin = url.searchParams.get("timeMin");
  const timeMax = url.searchParams.get("timeMax");
  const workspaceId = url.searchParams.get("workspaceId");
  if (!timeMin || !timeMax || !workspaceId) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const admin = adminClient();

  // Sécurité : le demandeur doit être membre de l'espace.
  const { data: me } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!me) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data: members } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId);

  const otherIds = (members ?? [])
    .map((m) => m.user_id)
    .filter((id) => id !== auth.userId);
  if (otherIds.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const { data: profs } = await admin
    .from("profiles")
    .select("id, full_name, color")
    .in("id", otherIds);
  const profById = new Map((profs ?? []).map((p) => [p.id, p]));

  const events: TeamEventDTO[] = [];
  await Promise.all(
    otherIds.map(async (memberId) => {
      try {
        const token = await getValidAccessToken(memberId);
        const { data: cals } = await admin
          .from("google_calendars")
          .select("google_calendar_id")
          .eq("user_id", memberId)
          .eq("selected", true);
        const prof = profById.get(memberId);
        const personName = prof?.full_name ?? "Membre";
        const personColor = prof?.color ?? "#94a3b8";
        await Promise.all(
          (cals ?? []).map(async (c) => {
            try {
              const items = await listEvents(token, c.google_calendar_id, timeMin, timeMax);
              for (const ev of items) {
                if (ev.status === "cancelled") continue;
                const start = ev.start?.dateTime ?? ev.start?.date ?? null;
                if (!start) continue;
                events.push({
                  id: `${memberId}:${ev.id}`,
                  title: ev.summary ?? "(occupé)",
                  start,
                  end: ev.end?.dateTime ?? ev.end?.date ?? null,
                  allDay: !!ev.start?.date,
                  personName,
                  personColor,
                });
              }
            } catch {
              /* un agenda en erreur n'arrête pas le reste */
            }
          }),
        );
      } catch (e) {
        if (!(e instanceof GoogleNotConnectedError)) {
          /* membre sans Google ou token invalide → ignoré */
        }
      }
    }),
  );

  return NextResponse.json({ events });
}
