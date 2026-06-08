"use client";

import { useState } from "react";
import Link from "next/link";
import { format, isToday, isWithinInterval, parseISO, startOfDay, endOfDay, addDays } from "date-fns";
import { CalendarClock, CheckCircle2, Circle, Clock, ListChecks, Repeat } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusPill } from "@/components/tasks/status-pill";
import type { Profile, Routine, Task } from "@/lib/queries";
import type { TaskStatus } from "@/lib/supabase/database.types";

type Project = { id: string; name: string; color: string };

const FREQ_LABEL = { daily: "Quotidien", weekly: "Hebdo", monthly: "Mensuel" } as const;

export function UpcomingTasks({
  tasks,
  projects,
  profiles,
  assigneesMap,
  onUpdate,
  routines,
  completedRoutineIds,
  onToggleRoutine,
}: {
  tasks: Task[];
  projects: Project[];
  profiles: Profile[];
  assigneesMap: Map<string, string[]>;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  routines: Routine[];
  completedRoutineIds: Set<string>;
  onToggleRoutine: (routineId: string, done: boolean) => void;
}) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekEnd = endOfDay(addDays(now, 6));

  const isDone = (t: Task) => (t.status as TaskStatus) === "fait";
  const withDate = tasks.filter((t) => t.due_date && !isDone(t));

  // Ordre de production : par échéance croissante, puis par heure dans la journée.
  const byDeadline = (a: Task, b: Task) => {
    const da = a.due_date ?? "";
    const db = b.due_date ?? "";
    if (da !== db) return da < db ? -1 : 1;
    const ta = a.time_of_day ?? "99:99";
    const tb = b.time_of_day ?? "99:99";
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  };

  const today = withDate
    .filter((t) => {
      const d = parseISO(t.due_date!);
      return isToday(d);
    })
    .sort(byDeadline);
  const week = withDate
    .filter((t) => {
      const d = parseISO(t.due_date!);
      return (
        isWithinInterval(d, { start: todayStart, end: weekEnd }) && !isToday(d)
      );
    })
    .sort(byDeadline);

  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <TasksColumn
        title="À faire aujourd'hui"
        icon={<CalendarClock className="size-4" />}
        accent="bg-orange-100 text-orange-700"
        tasks={today}
        projectsById={projectsById}
        profileById={profileById}
        assigneesMap={assigneesMap}
        onUpdate={onUpdate}
        emptyLabel="Rien de prévu aujourd'hui. Profite ☀️"
      />
      <RoutinesColumn
        routines={routines}
        projectsById={projectsById}
        completedRoutineIds={completedRoutineIds}
        onToggle={onToggleRoutine}
      />
      <TasksColumn
        title="Cette semaine"
        icon={<ListChecks className="size-4" />}
        accent="bg-accent text-accent-foreground"
        tasks={week}
        projectsById={projectsById}
        profileById={profileById}
        assigneesMap={assigneesMap}
        onUpdate={onUpdate}
        emptyLabel="Rien dans les 7 prochains jours."
      />
    </div>
  );
}

function RoutinesColumn({
  routines,
  projectsById,
  completedRoutineIds,
  onToggle,
}: {
  routines: Routine[];
  projectsById: Map<string, Project>;
  completedRoutineIds: Set<string>;
  onToggle: (routineId: string, done: boolean) => void;
}) {
  const doneCount = routines.filter((r) => completedRoutineIds.has(r.id)).length;
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
            <Repeat className="size-4" />
          </span>
          Routines du jour
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {doneCount}/{routines.length}
        </span>
      </header>
      {routines.length === 0 ? (
        <div className="p-6 text-center text-sm italic text-muted-foreground">
          Aucune routine prévue aujourd&apos;hui.
        </div>
      ) : (
        <ul className="divide-y">
          {routines.map((r) => {
            const proj = r.project_id ? projectsById.get(r.project_id) : undefined;
            const done = completedRoutineIds.has(r.id);
            return (
              <li
                key={r.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30"
              >
                <button
                  type="button"
                  onClick={() => onToggle(r.id, !done)}
                  aria-label={done ? "Décocher" : "Cocher comme fait"}
                  className={
                    done
                      ? "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-colors"
                      : "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                  }
                >
                  {done ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Circle className="size-4" />
                  )}
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={
                      "truncate text-sm font-medium " +
                      (done ? "text-muted-foreground line-through" : "")
                    }
                  >
                    {r.title}
                  </span>
                  {proj && (
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: proj.color ?? "#94a3b8" }}
                      />
                      {proj.name}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 ring-1 ring-purple-200">
                    {FREQ_LABEL[r.frequency]}
                  </span>
                  {r.time_of_day && (
                    <span className="rounded-md border bg-background px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                      {r.time_of_day.slice(0, 5)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function TasksColumn({
  title,
  icon,
  accent,
  tasks,
  projectsById,
  profileById,
  assigneesMap,
  onUpdate,
  emptyLabel,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  tasks: Task[];
  projectsById: Map<string, Project>;
  profileById: Map<string, Profile>;
  assigneesMap: Map<string, string[]>;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  emptyLabel: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span
            className={`inline-flex size-7 items-center justify-center rounded-lg ${accent}`}
          >
            {icon}
          </span>
          {title}
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {tasks.length}
        </span>
      </header>
      {tasks.length === 0 ? (
        <div className="p-6 text-center text-sm italic text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <ul className="divide-y">
          {tasks.map((t) => {
            const proj = t.project_id ? projectsById.get(t.project_id) : undefined;
            const assignees = (assigneesMap.get(t.id) ?? [])
              .map((uid) => profileById.get(uid))
              .filter(Boolean) as Profile[];
            return (
              <TaskItem
                key={t.id}
                task={t}
                proj={proj}
                assignees={assignees}
                onUpdate={onUpdate}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

function TaskItem({
  task: t,
  proj,
  assignees,
  onUpdate,
}: {
  task: Task;
  proj: Project | undefined;
  assignees: Profile[];
  onUpdate: (id: string, patch: Partial<Task>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(t.title);

  function commitTitle() {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== t.title) onUpdate(t.id, { title: next });
    else setDraft(t.title);
  }

  return (
    <li className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setDraft(t.title);
                setEditing(false);
              }
            }}
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(t.title);
              setEditing(true);
            }}
            className="truncate text-left text-sm font-medium hover:underline"
            title="Modifier le titre"
          >
            {t.title}
          </button>
        )}
        <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {proj && (
            <Link
              href={`/app/projects/${proj.id}`}
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ backgroundColor: proj.color ?? "#94a3b8" }}
              />
              {proj.name}
            </Link>
          )}
          {proj && <span className="text-muted-foreground/60">·</span>}
          {/* Édition directe de la date (native, tactile) */}
          <label className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 font-medium text-foreground/80 transition-colors hover:bg-muted/70">
            <CalendarClock className="size-3" />
            <input
              type="date"
              value={format(parseISO(t.due_date!), "yyyy-MM-dd")}
              onChange={(e) =>
                onUpdate(t.id, {
                  due_date: e.target.value
                    ? new Date(`${e.target.value}T12:00:00`).toISOString()
                    : null,
                })
              }
              className="bg-transparent text-[11px] outline-none [&::-webkit-calendar-picker-indicator]:opacity-50"
              aria-label="Date d'échéance"
            />
          </label>
          {/* Édition directe de l'heure (native, tactile) */}
          <label className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 font-medium tabular-nums text-foreground/80 transition-colors hover:bg-muted/70">
            <Clock className="size-3" />
            <input
              type="time"
              value={t.time_of_day ? t.time_of_day.slice(0, 5) : ""}
              onChange={(e) =>
                onUpdate(t.id, {
                  time_of_day: e.target.value ? `${e.target.value}:00` : null,
                })
              }
              className="bg-transparent text-[11px] tabular-nums outline-none [&::-webkit-calendar-picker-indicator]:opacity-50"
              aria-label="Heure de la tâche"
            />
          </label>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusPill
          status={t.status as TaskStatus}
          onChange={(s) => onUpdate(t.id, { status: s })}
          size="sm"
        />
        <div className="flex -space-x-1.5">
          {assignees.slice(0, 3).map((p) => {
            const init = (p.full_name ?? "?").trim().charAt(0).toUpperCase();
            return (
              <Avatar
                key={p.id}
                className="size-6 border-2 border-card"
                style={{ backgroundColor: p.color }}
                title={p.full_name ?? ""}
              >
                {p.avatar_url && (
                  <AvatarImage src={p.avatar_url} alt={p.full_name ?? ""} />
                )}
                <AvatarFallback
                  className="text-[9px] text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {init}
                </AvatarFallback>
              </Avatar>
            );
          })}
        </div>
      </div>
    </li>
  );
}
