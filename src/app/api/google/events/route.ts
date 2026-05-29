import { NextResponse } from "next/server";
import { createClient as createServerSb } from "@/lib/supabase/server";
import { requireUser } from "@/lib/google/route-helpers";
import { getValidAccessToken, GoogleNotConnectedError } from "@/lib/google/server";
import { listEvents } from "@/lib/google/calendar";

export interface CalendarEventDTO {
  id: string;
  calendarId: string;
  title: string;
  color: string | null;
  start: string; // ISO ou yyyy-mm-dd (all-day)
  end: string | null;
  allDay: boolean;
  htmlLink: string | null;
}

/**
 * GET ?timeMin&timeMax : événements des agendas sélectionnés sur la plage,
 * fusionnés et normalisés pour l'affichage des disponibilités.
 */
export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const url = new URL(req.url);
  const timeMin = url.searchParams.get("timeMin");
  const timeMax = url.searchParams.get("timeMax");
  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: "timeMin/timeMax requis" }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(auth.userId);
  } catch (e) {
    if (e instanceof GoogleNotConnectedError) {
      return NextResponse.json({ connected: false, events: [] });
    }
    return NextResponse.json({ error: "token_error" }, { status: 500 });
  }

  const supabase = await createServerSb();
  const { data: calendars } = await supabase
    .from("google_calendars")
    .select("google_calendar_id, bg_color, selected")
    .eq("user_id", auth.userId)
    .eq("selected", true);

  const events: CalendarEventDTO[] = [];
  await Promise.all(
    (calendars ?? []).map(async (cal) => {
      try {
        const items = await listEvents(accessToken, cal.google_calendar_id, timeMin, timeMax);
        for (const ev of items) {
          if (ev.status === "cancelled") continue;
          const allDay = !!ev.start?.date;
          const start = ev.start?.dateTime ?? ev.start?.date ?? null;
          if (!start) continue;
          events.push({
            id: ev.id,
            calendarId: cal.google_calendar_id,
            title: ev.summary ?? "(sans titre)",
            color: cal.bg_color,
            start,
            end: ev.end?.dateTime ?? ev.end?.date ?? null,
            allDay,
            htmlLink: ev.htmlLink ?? null,
          });
        }
      } catch {
        // un agenda en erreur ne casse pas l'ensemble
      }
    }),
  );

  return NextResponse.json({ connected: true, events });
}
