import { NextResponse } from "next/server";
import { createClient as createServerSb } from "@/lib/supabase/server";
import { requireUser } from "@/lib/google/route-helpers";
import { getValidAccessToken, GoogleNotConnectedError } from "@/lib/google/server";
import { listCalendars } from "@/lib/google/calendar";

/**
 * GET : liste les agendas Google de l'utilisateur et les synchronise dans
 * `google_calendars` (sans écraser le flag `selected` existant). Renvoie les
 * agendas stockés + l'agenda cible d'écriture.
 */
export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(auth.userId);
  } catch (e) {
    if (e instanceof GoogleNotConnectedError) {
      return NextResponse.json({ connected: false, calendars: [] });
    }
    return NextResponse.json({ error: "token_error" }, { status: 500 });
  }

  const supabase = await createServerSb();

  try {
    const entries = await listCalendars(accessToken);
    for (const c of entries) {
      // N'écrase pas `selected` : colonnes omises → non modifiées on conflict.
      await supabase.from("google_calendars").upsert(
        {
          user_id: auth.userId,
          google_calendar_id: c.id,
          summary: c.summary,
          bg_color: c.backgroundColor ?? null,
        },
        { onConflict: "user_id,google_calendar_id" },
      );
    }
  } catch {
    return NextResponse.json({ error: "list_failed" }, { status: 502 });
  }

  const { data: calendars } = await supabase
    .from("google_calendars")
    .select("*")
    .eq("user_id", auth.userId)
    .order("summary", { ascending: true });

  const { data: conn } = await supabase
    .from("google_connections")
    .select("write_calendar_id, google_email")
    .eq("user_id", auth.userId)
    .maybeSingle();

  return NextResponse.json({
    connected: true,
    email: conn?.google_email ?? null,
    writeCalendarId: conn?.write_calendar_id ?? null,
    calendars: calendars ?? [],
  });
}

/**
 * PATCH : met à jour la sélection d'affichage et/ou l'agenda cible d'écriture.
 * Body : { selected?: { [googleCalendarId]: boolean }, writeCalendarId?: string }
 */
export async function PATCH(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const body = (await req.json()) as {
    selected?: Record<string, boolean>;
    writeCalendarId?: string | null;
  };
  const supabase = await createServerSb();

  if (body.selected) {
    for (const [calId, sel] of Object.entries(body.selected)) {
      await supabase
        .from("google_calendars")
        .update({ selected: sel })
        .eq("user_id", auth.userId)
        .eq("google_calendar_id", calId);
    }
  }

  if (body.writeCalendarId !== undefined) {
    await supabase
      .from("google_connections")
      .update({ write_calendar_id: body.writeCalendarId })
      .eq("user_id", auth.userId);
  }

  return NextResponse.json({ ok: true });
}
