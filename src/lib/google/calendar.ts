import { googleFetch } from "@/lib/google/server";

/**
 * Helpers Google Calendar (serveur). S'appuie sur googleFetch (Bearer token).
 * Docs : https://developers.google.com/calendar/api/v3/reference
 */

const BASE = "https://www.googleapis.com/calendar/v3";

export interface GCalendarListEntry {
  id: string;
  summary: string;
  backgroundColor?: string;
  primary?: boolean;
  accessRole?: string;
}

export interface GEvent {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  status?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
}

export async function listCalendars(accessToken: string): Promise<GCalendarListEntry[]> {
  const res = await googleFetch(
    accessToken,
    `${BASE}/users/me/calendarList?minAccessRole=reader&fields=items(id,summary,backgroundColor,primary,accessRole)`,
  );
  if (!res.ok) throw new Error(`calendarList.list ${res.status}`);
  const json = (await res.json()) as { items?: GCalendarListEntry[] };
  return json.items ?? [];
}

export async function listEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const res = await googleFetch(
    accessToken,
    `${BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
  );
  if (!res.ok) throw new Error(`events.list ${res.status}`);
  const json = (await res.json()) as { items?: GEvent[] };
  return json.items ?? [];
}

export async function getEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<GEvent | null> {
  const res = await googleFetch(
    accessToken,
    `${BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
  );
  if (res.status === 404 || res.status === 410) return null;
  if (!res.ok) throw new Error(`events.get ${res.status}`);
  return (await res.json()) as GEvent;
}

/** Construit le payload start/end d'un event à partir d'une tâche datée. */
export function eventTimesFromTask(dueDate: string, timeOfDay: string | null): {
  start: GEvent["start"];
  end: GEvent["end"];
} {
  if (timeOfDay) {
    const day = new Date(dueDate).toISOString().slice(0, 10);
    const hhmm = timeOfDay.slice(0, 5);
    const startDt = new Date(`${day}T${hhmm}:00`);
    const endDt = new Date(startDt.getTime() + 60 * 60_000);
    return {
      start: { dateTime: startDt.toISOString() },
      end: { dateTime: endDt.toISOString() },
    };
  }
  // Événement « toute la journée »
  const day = new Date(dueDate).toISOString().slice(0, 10);
  const next = new Date(new Date(day).getTime() + 24 * 60 * 60_000)
    .toISOString()
    .slice(0, 10);
  return { start: { date: day }, end: { date: next } };
}

export async function insertEvent(
  accessToken: string,
  calendarId: string,
  body: Partial<GEvent>,
): Promise<GEvent> {
  const res = await googleFetch(
    accessToken,
    `${BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (!res.ok) throw new Error(`events.insert ${res.status} ${await res.text()}`);
  return (await res.json()) as GEvent;
}

export async function patchEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  body: Partial<GEvent>,
): Promise<GEvent> {
  const res = await googleFetch(
    accessToken,
    `${BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  if (!res.ok) throw new Error(`events.patch ${res.status} ${await res.text()}`);
  return (await res.json()) as GEvent;
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const res = await googleFetch(
    accessToken,
    `${BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
  // 404/410 = déjà supprimé → on ignore
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`events.delete ${res.status}`);
  }
}
