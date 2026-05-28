"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAllTasks, useCreateTask, useProjects } from "@/lib/queries";
import type { TaskStatus } from "@/lib/supabase/database.types";
import { statusColor } from "@/components/tasks/status-pill";

type ViewMode = "day" | "week" | "month";

export default function CalendarPage() {
  const { data: tasks = [], isLoading } = useAllTasks();
  const { data: projects = [] } = useProjects();
  const createTask = useCreateTask();
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [quickAdd, setQuickAdd] = useState<{ date: Date } | null>(null);

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );

  const range = useMemo(() => {
    if (view === "day") {
      return { start: cursor, end: cursor, days: [cursor] };
    }
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: 1 });
      const end = endOfWeek(cursor, { weekStartsOn: 1 });
      return { start, end, days: eachDayOfInterval({ start, end }) };
    }
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return { start, end, days: eachDayOfInterval({ start, end }) };
  }, [cursor, view]);

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

  function navigate(dir: -1 | 1) {
    setCursor((c) => {
      if (view === "day") return addDays(c, dir);
      if (view === "week") return dir > 0 ? addWeeks(c, 1) : subWeeks(c, 1);
      return dir > 0 ? addMonths(c, 1) : subMonths(c, 1);
    });
  }

  const headerLabel =
    view === "day"
      ? format(cursor, "EEEE d MMMM yyyy", { locale: fr })
      : view === "week"
        ? `${format(range.start, "d MMM", { locale: fr })} – ${format(range.end, "d MMM yyyy", { locale: fr })}`
        : format(cursor, "MMMM yyyy", { locale: fr });

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-blue-100 text-blue-700">
            <CalendarDays className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold capitalize">{headerLabel}</h1>
            <p className="text-xs text-muted-foreground">
              Clique sur un jour pour créer une tâche.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border bg-card p-0.5 shadow-sm">
            {(["day", "week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === v
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {v === "day" ? "Jour" : v === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
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

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : view === "day" ? (
        <DayView
          day={cursor}
          tasks={tasksByDate.get(format(cursor, "yyyy-MM-dd")) ?? []}
          projectsById={projectsById}
          onAdd={() => setQuickAdd({ date: cursor })}
        />
      ) : (
        <MonthOrWeekGrid
          days={range.days}
          cursor={cursor}
          view={view}
          tasksByDate={tasksByDate}
          projectsById={projectsById}
          onAddOnDate={(d) => setQuickAdd({ date: d })}
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
              await createTask.mutateAsync({
                project_id: input.projectId,
                title: input.title,
                position: 0,
                due_date: input.date.toISOString(),
              });
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

function MonthOrWeekGrid({
  days,
  cursor,
  view,
  tasksByDate,
  projectsById,
  onAddOnDate,
}: {
  days: Date[];
  cursor: Date;
  view: "week" | "month";
  tasksByDate: Map<string, ReturnType<typeof useAllTasks>["data"] extends (infer T)[] | undefined ? T[] : never>;
  projectsById: Map<string, { id: string; name: string; color: string | null }>;
  onAddOnDate: (d: Date) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="grid grid-cols-7 border-b bg-muted/30 text-xs font-semibold uppercase text-muted-foreground">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="px-2 py-2 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const inMonth = view === "week" || isSameMonth(d, cursor);
          const today = isToday(d);
          const key = format(d, "yyyy-MM-dd");
          const items = tasksByDate.get(key) ?? [];
          return (
            <div
              key={key}
              className={[
                "group relative min-h-24 border-b border-r p-1.5 last:border-r-0 sm:min-h-28 sm:p-2",
                view === "week" ? "min-h-40 sm:min-h-56" : "",
                inMonth ? "bg-card" : "bg-muted/20 text-muted-foreground/60",
              ].join(" ")}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={[
                    "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                    today ? "bg-blue-600 text-white" : "",
                  ].join(" ")}
                >
                  {format(d, "d")}
                </span>
                <button
                  type="button"
                  onClick={() => onAddOnDate(d)}
                  className="grid size-5 place-items-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                  aria-label="Ajouter une tâche"
                >
                  <Plus className="size-3" />
                </button>
              </div>
              <ul className="flex flex-col gap-0.5">
                {items.slice(0, view === "week" ? 8 : 3).map((t) => {
                  const proj = projectsById.get(t.project_id ?? "");
                  const color =
                    (proj?.color as string | null) ?? statusColor(t.status as TaskStatus);
                  return (
                    <li key={t.id}>
                      <Link
                        href={proj ? `/app/projects/${proj.id}` : "#"}
                        className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] hover:bg-muted"
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
              {items.length > (view === "week" ? 8 : 3) && (
                <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">
                  +{items.length - (view === "week" ? 8 : 3)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const HOUR_PX = 56;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function DayView({
  day,
  tasks,
  projectsById,
  onAdd,
}: {
  day: Date;
  tasks: ReturnType<typeof useAllTasks>["data"] extends (infer T)[] | undefined ? T[] : never;
  projectsById: Map<string, { id: string; name: string; color: string | null }>;
  onAdd: () => void;
}) {
  const untimed = tasks.filter((t) => !t.time_of_day);
  const timed = tasks.filter((t) => !!t.time_of_day);
  const nowMinutes =
    isToday(day) ? new Date().getHours() * 60 + new Date().getMinutes() : null;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
        <div className="text-sm font-semibold capitalize">
          {format(day, "EEEE d MMMM", { locale: fr })}
        </div>
        <Button
          size="sm"
          onClick={onAdd}
          className="bg-blue-600 text-white hover:bg-blue-700"
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
              <div className="flex-1" />
            </div>
          ))}

          {nowMinutes !== null && (
            <div
              aria-hidden
              className="pointer-events-none absolute left-16 right-2 z-20 flex items-center"
              style={{ top: (nowMinutes / 60) * HOUR_PX }}
            >
              <span className="size-2.5 rounded-full bg-red-500 shadow" />
              <span className="ml-0 h-px flex-1 bg-red-500" />
            </div>
          )}

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
                className="absolute left-16 right-2 z-10 flex h-12 items-center gap-2 overflow-hidden rounded-lg border-l-4 bg-card px-3 shadow-sm hover:shadow-md"
                style={{
                  top,
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
              className="bg-blue-600 text-white hover:bg-blue-700"
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
