import { NextResponse } from "next/server";
import { createClient as createServerSb } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { requireUser } from "@/lib/google/route-helpers";
import { getValidAccessToken, GoogleNotConnectedError } from "@/lib/google/server";
import {
  deleteEvent,
  eventTimesFromTask,
  getEvent,
  insertEvent,
  patchEvent,
} from "@/lib/google/calendar";

/**
 * POST { taskId, action }
 *  - "push"   : crée/maj l'événement Google de la tâche datée (ou le supprime
 *               si la tâche n'a plus de date). Mémorise google_event_id/calendar.
 *  - "pull"   : relit l'événement Google et met à jour la tâche (date/heure/titre).
 *  - "delete" : supprime l'événement Google lié.
 */
export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { taskId, action = "push" } = (await req.json()) as {
    taskId?: string;
    action?: "push" | "pull" | "delete";
  };
  if (!taskId) return NextResponse.json({ error: "taskId requis" }, { status: 400 });

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(auth.userId);
  } catch (e) {
    if (e instanceof GoogleNotConnectedError) {
      return NextResponse.json({ connected: false }, { status: 409 });
    }
    return NextResponse.json({ error: "token_error" }, { status: 500 });
  }

  const supabase = await createServerSb();
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, due_date, time_of_day, google_event_id, google_calendar_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: "task_introuvable" }, { status: 404 });

  const { data: conn } = await supabase
    .from("google_connections")
    .select("write_calendar_id")
    .eq("user_id", auth.userId)
    .maybeSingle();

  try {
    if (action === "delete") {
      if (task.google_event_id && task.google_calendar_id) {
        await deleteEvent(accessToken, task.google_calendar_id, task.google_event_id);
      }
      await supabase
        .from("tasks")
        .update({ google_event_id: null, google_calendar_id: null, google_synced_at: null })
        .eq("id", task.id);
      return NextResponse.json({ ok: true, action });
    }

    if (action === "pull") {
      if (!task.google_event_id || !task.google_calendar_id) {
        return NextResponse.json({ ok: true, action, skipped: "no_event" });
      }
      const ev = await getEvent(accessToken, task.google_calendar_id, task.google_event_id);
      if (!ev) {
        // Event supprimé côté Google → on délie
        await supabase
          .from("tasks")
          .update({ google_event_id: null, google_calendar_id: null })
          .eq("id", task.id);
        return NextResponse.json({ ok: true, action, unlinked: true });
      }
      const startIso = ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T09:00:00` : null);
      const patch: Database["public"]["Tables"]["tasks"]["Update"] = {
        google_synced_at: new Date().toISOString(),
      };
      if (ev.summary) patch.title = ev.summary;
      if (startIso) {
        patch.due_date = new Date(startIso).toISOString();
        patch.time_of_day = ev.start?.dateTime
          ? new Date(ev.start.dateTime).toISOString().slice(11, 19)
          : null;
      }
      await supabase.from("tasks").update(patch).eq("id", task.id);
      return NextResponse.json({ ok: true, action });
    }

    // action === "push"
    if (!task.due_date) {
      // Plus de date → on retire l'event s'il existait
      if (task.google_event_id && task.google_calendar_id) {
        await deleteEvent(accessToken, task.google_calendar_id, task.google_event_id);
        await supabase
          .from("tasks")
          .update({ google_event_id: null, google_calendar_id: null, google_synced_at: null })
          .eq("id", task.id);
      }
      return NextResponse.json({ ok: true, action, skipped: "no_due_date" });
    }

    const calendarId = task.google_calendar_id ?? conn?.write_calendar_id ?? "primary";
    const times = eventTimesFromTask(task.due_date, task.time_of_day);
    const eventBody = { summary: task.title, start: times.start, end: times.end };

    let eventId = task.google_event_id;
    if (eventId) {
      await patchEvent(accessToken, calendarId, eventId, eventBody);
    } else {
      const created = await insertEvent(accessToken, calendarId, eventBody);
      eventId = created.id;
    }

    await supabase
      .from("tasks")
      .update({
        google_event_id: eventId,
        google_calendar_id: calendarId,
        google_synced_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    return NextResponse.json({ ok: true, action, eventId });
  } catch {
    return NextResponse.json({ error: "sync_failed" }, { status: 502 });
  }
}
