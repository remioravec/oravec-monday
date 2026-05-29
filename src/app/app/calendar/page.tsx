"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  format,
  isToday,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useAllTasks,
  useCreateTask,
  useGoogleEvents,
  useGoogleCalendars,
  useUpdateGoogleCalendars,
  useTeamEvents,
  useProjects,
  syncTaskToGoogle,
  type GoogleCalendarEvent,
  type TeamEvent,
} from "@/lib/queries";
import type { TaskStatus } from "@/lib/supabase/database.types";
import { statusColor } from "@/components/tasks/status-pill";

export default function CalendarPage() {
  const { data: tasks = [], isLoading } = useAllTasks();
  const { data: projects = [] } = useProjects();
  const createTask = useCreateTask();
  const [cursor, setCursor] = useState(new Date());
  const [quickAdd, setQuickAdd] = useState<{ date: Date } | null>(null);

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );

  // Vue jour uniquement : la plage couvre la journée affichée.
  const range = useMemo(
    () => ({ start: cursor, end: cursor }),
    [cursor],
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = format(parseISO(t.due_date), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasks]);

  // Événements Google Agenda sur la plage visible (disponibilités).
  const { data: googleData } = useGoogleEvents(
    range.start.toISOString(),
    range.end.toISOString(),
  );
  const googleByDate = useMemo(() => {
    const map = new Map<string, GoogleCalendarEvent[]>();
    for (const ev of googleData?.events ?? []) {
      const key = format(parseISO(ev.start), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }
    return map;
  }, [googleData]);

  // Agendas connectés : cases à cocher pour afficher/masquer (lisibilité).
  const { data: gcal } = useGoogleCalendars();
  const updateCals = useUpdateGoogleCalendars();
  const calendars = gcal?.connected ? gcal.calendars : [];

  // Agendas de l'équipe (lecture seule, dispos des autres membres).
  const [showTeam, setShowTeam] = useState(false);
  const { data: teamEvents = [] } = useTeamEvents(
    range.start.toISOString(),
    range.end.toISOString(),
    showTeam,
  );
  const teamByDate = useMemo(() => {
    const map = new Map<string, TeamEvent[]>();
    for (const ev of teamEvents) {
      const key = format(parseISO(ev.start), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }
    return map;
  }, [teamEvents]);

  function navigate(dir: -1 | 1) {
    setCursor((c) => addDays(c, dir));
  }

  const headerLabel = format(cursor, "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <CalendarDays className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold capitalize">{headerLabel}</h1>
            <p className="text-xs text-muted-foreground">
              Clique sur un jour pour créer une tâche.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => navigate(-1)}
              aria-label="Précédent"
            >
              <ChevronLeft />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCursor(new Date())}
            >
              Aujourd&apos;hui
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => navigate(1)}
              aria-label="Suivant"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </header>

      {(calendars.length > 0 || gcal?.connected) && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTeam((v) => !v)}
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              showTeam
                ? "border-transparent bg-primary text-white shadow-sm"
                : "border-dashed text-muted-foreground",
            ].join(" ")}
            title="Afficher les agendas de l'équipe (lecture seule)"
          >
            <Users className="size-3.5" />
            Équipe
          </button>
          <span className="text-xs font-medium text-muted-foreground">Agendas :</span>
          {calendars.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() =>
                updateCals.mutate({
                  selected: { [c.google_calendar_id]: !c.selected },
                })
              }
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                c.selected
                  ? "border-transparent bg-card shadow-sm"
                  : "border-dashed text-muted-foreground opacity-60",
              ].join(" ")}
              title={c.selected ? "Masquer cet agenda" : "Afficher cet agenda"}
            >
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: c.bg_color ?? "#9ca3af" }}
              />
              <span className="max-w-[140px] truncate">
                {c.summary ?? c.google_calendar_id}
              </span>
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : (
        <DayView
          day={cursor}
          tasks={tasksByDate.get(format(cursor, "yyyy-MM-dd")) ?? []}
          googleEvents={googleByDate.get(format(cursor, "yyyy-MM-dd")) ?? []}
          teamEvents={teamByDate.get(format(cursor, "yyyy-MM-dd")) ?? []}
          projectsById={projectsById}
          onAdd={() => setQuickAdd({ date: cursor })}
        />
      )}

      {quickAdd && (
        <QuickAddModal
          date={quickAdd.date}
          projects={projects.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color ?? "#94a3b8",
          }))}
          onClose={() => setQuickAdd(null)}
          onCreate={async (input) => {
            try {
              const created = await createTask.mutateAsync({
                project_id: input.projectId,
                title: input.title,
                position: 0,
                due_date: input.date.toISOString(),
              });
              // Crée l'événement dans Google Agenda (best-effort).
              if (created?.id) void syncTaskToGoogle(created.id, "push");
              toast.success("Tâche créée");
              setQuickAdd(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Erreur");
            }
          }}
        />
      )}
    </div>
  );
}

const HOUR_PX = 56;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function DayView({
  day,
  tasks,
  googleEvents,
  teamEvents,
  projectsById,
  onAdd,
}: {
  day: Date;
  tasks: ReturnType<typeof useAllTasks>["data"] extends (infer T)[] | undefined ? T[] : never;
  googleEvents: GoogleCalendarEvent[];
  teamEvents: TeamEvent[];
  projectsById: Map<string, { id: string; name: string; color: string | null }>;
  onAdd: () => void;
}) {
  const untimed = tasks.filter((t) => !t.time_of_day);
  const timed = tasks.filter((t) => !!t.time_of_day);
  const nowMinutes =
    isToday(day) ? new Date().getHours() * 60 + new Date().getMinutes() : null;

  // Agenda (Google perso + équipe) normalisé en une seule liste pour la vue jour.
  type AgendaItem = {
    key: string;
    title: string;
    color: string;
    allDay: boolean;
    start: string;
    end: string | null;
    person: string | null;
    href: string | null;
  };
  const agenda: AgendaItem[] = [
    ...googleEvents.map((e) => ({
      key: "g:" + e.calendarId + e.id,
      title: e.title,
      color: e.color ?? "#9ca3af",
      allDay: e.allDay,
      start: e.start,
      end: e.end,
      person: null,
      href: e.htmlLink,
    })),
    ...teamEvents.map((e) => ({
      key: "t:" + e.id,
      title: e.title,
      color: e.personColor,
      allDay: e.allDay,
      start: e.start,
      end: e.end,
      person: e.personName,
      href: null,
    })),
  ];
  const agendaAllDay = agenda.filter((a) => a.allDay);
  const agendaTimed = agenda
    .filter((a) => !a.allDay)
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));
  const minutesOf = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
        <div className="text-sm font-semibold capitalize">
          {format(day, "EEEE d MMMM", { locale: fr })}
        </div>
        <Button
          size="sm"
          onClick={onAdd}
          className="bg-primary text-white hover:bg-primary/90"
        >
          <Plus className="size-3.5" />
          Ajouter une tâche
        </Button>
      </header>

      {untimed.length > 0 && (
        <div className="border-b bg-amber-50/60 px-5 py-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            Sans heure ({untimed.length})
          </div>
          <ul className="flex flex-wrap gap-2">
            {untimed.map((t) => {
              const proj = projectsById.get(t.project_id ?? "");
              const color =
                (proj?.color as string | null) ?? statusColor(t.status as TaskStatus);
              return (
                <li key={t.id}>
                  <Link
                    href={proj ? `/app/projects/${proj.id}` : "#"}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs hover:bg-muted/40"
                  >
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">{t.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {agendaAllDay.length > 0 && (
        <div className="border-b bg-muted/30 px-5 py-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="size-3" />
            Agenda · journée entière ({agendaAllDay.length})
          </div>
          <ul className="flex flex-wrap gap-2">
            {agendaAllDay.map((a) => (
              <li key={a.key}>
                <a
                  href={a.href ?? "#"}
                  target={a.href ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border-l-2 bg-card px-2.5 py-1 text-xs hover:bg-muted/40"
                  style={{ borderColor: a.color }}
                  title={a.person ? `${a.person} — ${a.title}` : a.title}
                >
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: a.color }}
                  />
                  <span className="truncate text-muted-foreground">
                    {a.person ? `${a.person} · ${a.title}` : a.title}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* En-têtes de colonnes (tâches à gauche, agenda à droite). */}
      <div className="flex border-b bg-muted/20 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="w-16 shrink-0" />
        <div className="flex-1 border-r px-3 py-1.5">Tâches</div>
        <div className="flex-1 px-3 py-1.5">Agenda</div>
      </div>

      <div className="relative max-h-[70vh] overflow-y-auto">
        <div className="relative" style={{ height: HOURS.length * HOUR_PX }}>
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 flex border-t border-border/50"
              style={{ top: h * HOUR_PX, height: HOUR_PX }}
            >
              <div className="w-16 shrink-0 px-2 pt-1 text-[10px] text-muted-foreground tabular-nums">
                {String(h).padStart(2, "0")}:00
              </div>
              <div className="flex-1 border-l border-border/40" />
            </div>
          ))}

          {/* Séparateur vertical entre la colonne tâches et la colonne agenda. */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 top-0 w-px bg-border"
            style={{ left: "calc(50% + 2rem)" }}
          />

          {nowMinutes !== null && (
            <div
              aria-hidden
              className="pointer-events-none absolute left-16 right-2 z-30 flex items-center"
              style={{ top: (nowMinutes / 60) * HOUR_PX }}
            >
              <span className="size-2.5 rounded-full bg-red-500 shadow" />
              <span className="ml-0 h-px flex-1 bg-red-500" />
            </div>
          )}

          {/* Colonne agenda (Google perso + équipe) — disponibilités. */}
          {agendaTimed.map((a) => {
            const startMin = minutesOf(a.start);
            const endMin = a.end ? minutesOf(a.end) : startMin + 60;
            const top = (startMin / 60) * HOUR_PX;
            const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 28);
            const body = (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground/80">
                    {a.title}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="tabular-nums">
                      {new Date(a.start).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {a.person && (
                      <>
                        <span>·</span>
                        <span className="truncate">{a.person}</span>
                      </>
                    )}
                  </div>
                </div>
              </>
            );
            const className =
              "absolute right-2 z-10 flex items-center gap-2 overflow-hidden rounded-lg border-l-4 px-3 shadow-sm";
            const style = {
              top,
              height,
              left: "calc(50% + 2rem)",
              borderLeftColor: a.color,
              backgroundColor: `${a.color}1a`,
            } as const;
            return a.href ? (
              <a
                key={a.key}
                href={a.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className + " hover:shadow-md"}
                style={style}
              >
                {body}
              </a>
            ) : (
              <div key={a.key} className={className} style={style}>
                {body}
              </div>
            );
          })}

          {timed.map((t) => {
            const proj = projectsById.get(t.project_id ?? "");
            const color =
              (proj?.color as string | null) ?? statusColor(t.status as TaskStatus);
            const [hh, mm] = (t.time_of_day ?? "00:00").split(":").map(Number);
            const top = ((hh ?? 0) * 60 + (mm ?? 0)) / 60 * HOUR_PX;
            return (
              <Link
                key={t.id}
                href={proj ? `/app/projects/${proj.id}` : "#"}
                className="absolute left-16 z-10 flex h-12 items-center gap-2 overflow-hidden rounded-lg border-l-4 bg-card px-3 shadow-sm hover:shadow-md"
                style={{
                  top,
                  right: "calc(50% - 2rem + 4px)",
                  borderLeftColor: color,
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="tabular-nums">
                      {(t.time_of_day ?? "").slice(0, 5)}
                    </span>
                    {proj && (
                      <>
                        <span>·</span>
                        <span className="truncate">{proj.name}</span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: statusColor(t.status as TaskStatus) }}
                >
                  {t.status === "a_faire"
                    ? "À faire"
                    : t.status === "en_cours"
                      ? "En cours"
                      : "Fait"}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuickAddModal({
  date,
  projects,
  onClose,
  onCreate,
}: {
  date: Date;
  projects: { id: string; name: string; color: string }[];
  onClose: () => void;
  onCreate: (input: { title: string; projectId: string; date: Date }) => void;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <h2 className="text-base font-semibold">Nouvelle tâche</h2>
            <p className="text-xs text-muted-foreground capitalize">
              {format(date, "EEEE d MMMM yyyy", { locale: fr })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !projectId) return;
            onCreate({ title: title.trim(), projectId, date });
          }}
          className="flex flex-col gap-4 px-5 py-4"
        >
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Projet
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-2 text-sm"
            >
              {projects.length === 0 && <option value="">Aucun projet</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Titre
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Préparer la réunion"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !projectId}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <Plus className="size-3.5" />
              Créer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
