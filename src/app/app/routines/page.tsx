"use client";

import { useState } from "react";
import { Repeat, Plus, Trash2, Pencil, Flame, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAllRoutines,
  useProjects,
  useRoutineCompletions,
  useRoutineCompletionsSince,
  useToggleRoutineCompletion,
  useUpsertRoutine,
  useDeleteRoutine,
  type Routine,
} from "@/lib/queries";

type ProjectOpt = { id: string; name: string; color: string | null };
const NO_PROJECT = "__none__";

const STREAK_GOAL = 30;
const DAYS = [
  { key: 1, label: "L" },
  { key: 2, label: "Ma" },
  { key: 3, label: "Me" },
  { key: 4, label: "J" },
  { key: 5, label: "V" },
  { key: 6, label: "S" },
  { key: 0, label: "D" },
];
const EMPTY_SET: Set<string> = new Set();

const dStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

function isDue(r: Routine, d: Date) {
  if (r.frequency === "daily") return true;
  if (r.frequency === "weekly") return (r.days_of_week ?? []).includes(d.getDay());
  if (r.frequency === "monthly") return d.getDate() === r.day_of_month;
  return false;
}

/** Timestamp de la prochaine occurrence (à partir d'aujourd'hui), pour le tri. */
function nextOccurrence(r: Routine, now: Date) {
  const [hh, mm] = (r.time_of_day ?? "23:59").slice(0, 5).split(":").map(Number);
  for (let off = 0; off <= 31; off++) {
    const d = new Date(now);
    d.setDate(d.getDate() + off);
    if (isDue(r, d)) {
      d.setHours(hh || 0, mm || 0, 0, 0);
      return d.getTime();
    }
  }
  return now.getTime() + 999 * 86400000; // jamais due dans le mois → tout en bas
}

function recurrenceSummary(r: Routine) {
  if (r.frequency === "daily") return "Tous les jours";
  if (r.frequency === "weekly") {
    const labels = DAYS.filter((d) => (r.days_of_week ?? []).includes(d.key)).map(
      (d) => d.label,
    );
    return labels.length ? labels.join(" · ") : "Aucun jour";
  }
  return `Le ${r.day_of_month} du mois`;
}

function computeStreak(dates: Set<string> | undefined, now: Date) {
  if (!dates || dates.size === 0) return 0;
  const cur = new Date(now);
  if (!dates.has(dStr(cur))) cur.setDate(cur.getDate() - 1);
  let streak = 0;
  while (dates.has(dStr(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export default function RoutinesPage() {
  const now = new Date();
  const todayStr = dStr(now);
  const since = new Date(now);
  since.setDate(since.getDate() - 40);
  const sinceStr = dStr(since);

  const { data: routines = [] } = useAllRoutines();
  const { data: projectsData = [] } = useProjects();
  const { data: doneToday = EMPTY_SET } = useRoutineCompletions(todayStr);
  const { data: range } = useRoutineCompletionsSince(sinceStr);
  const toggle = useToggleRoutineCompletion();
  const upsert = useUpsertRoutine();
  const del = useDeleteRoutine();

  const [composer, setComposer] = useState<"new" | Routine | null>(null);

  const projects: ProjectOpt[] = projectsData.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }));
  const projectsById = new Map(projects.map((p) => [p.id, p]));

  const active = routines.filter((r) => r.active);

  // Regroupement par projet, trié par prochaine occurrence (la plus proche).
  const byProject = new Map<string, Routine[]>();
  for (const r of active) {
    const key = r.project_id && projectsById.has(r.project_id) ? r.project_id : NO_PROJECT;
    const arr = byProject.get(key) ?? [];
    arr.push(r);
    byProject.set(key, arr);
  }
  for (const arr of byProject.values()) {
    arr.sort((a, b) => nextOccurrence(a, now) - nextOccurrence(b, now));
  }
  // Projets ordonnés par leur prochaine routine (la plus proche d'abord).
  const groupKeys = [...byProject.keys()].sort((a, b) => {
    const na = Math.min(...byProject.get(a)!.map((r) => nextOccurrence(r, now)));
    const nb = Math.min(...byProject.get(b)!.map((r) => nextOccurrence(r, now)));
    return na - nb;
  });

  const dueCount = active.filter((r) => isDue(r, now)).length;
  const doneCount = active.filter((r) => isDue(r, now) && doneToday.has(r.id)).length;

  async function save(input: ComposerValue, routine: Routine | null) {
    try {
      await upsert.mutateAsync({
        id: routine?.id,
        project_id: input.projectId,
        title: input.title.trim(),
        description: routine?.description ?? null,
        frequency: input.everyDay ? "daily" : "weekly",
        days_of_week: input.everyDay ? null : input.days,
        day_of_month: null,
        time_of_day: input.time || "09:00",
        active: true,
        assignee_ids: [],
      });
      toast.success(routine ? "Routine mise à jour" : "Routine créée");
      setComposer(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  function renderRoutine(r: Routine) {
    if (composer !== null && typeof composer !== "string" && composer.id === r.id) {
      return (
        <li key={r.id}>
          <RoutineComposer
            routine={r}
            projects={projects}
            onCancel={() => setComposer(null)}
            onSave={(v) => save(v, r)}
          />
        </li>
      );
    }
    return (
      <RoutineCard
        key={r.id}
        routine={r}
        now={now}
        done={doneToday.has(r.id)}
        completions={range?.get(r.id)}
        onToggle={(done) => toggle.mutate({ routineId: r.id, day: todayStr, done })}
        onEdit={() => setComposer(r)}
        onDelete={() => {
          if (window.confirm(`Supprimer la routine « ${r.title} » ?`)) {
            del.mutate(r.id, { onError: (e) => toast.error(e.message) });
          }
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-purple-100 text-purple-700">
            <Repeat className="size-5" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Routines</h1>
            <p className="text-sm text-muted-foreground">
              Coche tes habitudes du jour et suis ta régularité.
              {dueCount > 0 && (
                <span className="ml-1 font-medium text-foreground">
                  {doneCount}/{dueCount} aujourd&apos;hui
                </span>
              )}
            </p>
          </div>
        </div>
        {composer === null && (
          <Button
            onClick={() => setComposer("new")}
            className="bg-primary text-white hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Nouvelle routine
          </Button>
        )}
      </header>

      {composer === "new" && (
        <RoutineComposer
          projects={projects}
          onCancel={() => setComposer(null)}
          onSave={(v) => save(v, null)}
        />
      )}

      {active.length === 0 && composer === null ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <Repeat className="mx-auto mb-3 size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Aucune routine pour l&apos;instant. Crée ta première habitude !
          </p>
          <Button onClick={() => setComposer("new")} className="mt-4">
            <Plus className="size-4" />
            Nouvelle routine
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groupKeys.map((key) => {
            const proj = key === NO_PROJECT ? null : projectsById.get(key);
            return (
              <section key={key} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: proj?.color ?? "#cbd5e1" }}
                  />
                  {proj ? proj.name : "Sans projet"}
                </div>
                <ul className="flex flex-col gap-2.5">
                  {(byProject.get(key) ?? []).map((r) => renderRoutine(r))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Carte d'une routine
// ============================================================================
function RoutineCard({
  routine: r,
  now,
  done,
  completions,
  onToggle,
  onEdit,
  onDelete,
}: {
  routine: Routine;
  now: Date;
  done: boolean;
  completions: Set<string> | undefined;
  onToggle: (done: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const due = isDue(r, now);
  const streak = computeStreak(completions, now);

  return (
    <li
      className={[
        "flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-colors sm:p-4",
        due && !done ? "" : "opacity-95",
      ].join(" ")}
    >
      {/* Case à cocher (active seulement les jours prévus) */}
      <button
        type="button"
        disabled={!due}
        onClick={() => onToggle(!done)}
        aria-label={done ? "Décocher" : "Marquer comme fait"}
        className={[
          "grid size-10 shrink-0 place-items-center rounded-full border-2 transition-colors",
          !due
            ? "cursor-default border-dashed border-muted-foreground/25 text-muted-foreground/30"
            : done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-muted-foreground/30 text-transparent hover:border-emerald-400 hover:bg-emerald-50",
        ].join(" ")}
      >
        <Check className="size-5" />
      </button>

      <div className="min-w-0 flex-1">
        <div
          className={[
            "truncate font-medium",
            done ? "text-muted-foreground line-through" : "",
          ].join(" ")}
        >
          {r.title}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{recurrenceSummary(r)}</span>
          {r.time_of_day && (
            <span className="tabular-nums">· {r.time_of_day.slice(0, 5)}</span>
          )}
          {!due && <span className="italic">· pas aujourd&apos;hui</span>}
        </div>
        <div className="mt-1.5">
          <WeekStrip routine={r} now={now} completions={completions} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StreakBadge streak={streak} />
        <div className="flex gap-0.5">
          <Button size="icon-xs" variant="ghost" onClick={onEdit} aria-label="Modifier">
            <Pencil />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={onDelete}
            aria-label="Supprimer"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </li>
  );
}

/** Frise des 7 derniers jours : vert = fait, anneau rouge = jour prévu manqué, gris = non prévu. */
function WeekStrip({
  routine: r,
  now,
  completions,
}: {
  routine: Routine;
  now: Date;
  completions: Set<string> | undefined;
}) {
  const days: { key: string; done: boolean; due: boolean; isToday: boolean; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dStr(d);
    days.push({
      key,
      done: completions?.has(key) ?? false,
      due: isDue(r, d),
      isToday: i === 0,
      label: ["D", "L", "M", "M", "J", "V", "S"][d.getDay()],
    });
  }
  return (
    <div className="flex items-center gap-1">
      {days.map((d) => {
        let cls = "bg-muted"; // non prévu
        if (d.done) cls = "bg-emerald-500";
        else if (d.due && !d.isToday) cls = "border-2 border-red-300 bg-red-50";
        else if (d.due && d.isToday) cls = "border-2 border-muted-foreground/30 bg-background";
        return (
          <span
            key={d.key}
            title={`${d.label}${d.done ? " · fait" : d.due ? " · prévu" : ""}`}
            className={`size-3 rounded-full ${cls}`}
          />
        );
      })}
    </div>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  const reached = streak >= STREAK_GOAL;
  const cls = reached
    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
    : streak > 0
      ? "bg-orange-100 text-orange-700 ring-orange-200"
      : "bg-muted text-muted-foreground ring-transparent";
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ${cls}`}
      title={
        reached
          ? `Objectif atteint : ${streak} jours d'affilée 🎉`
          : `${streak} jour${streak > 1 ? "s" : ""} d'affilée (objectif ${STREAK_GOAL})`
      }
    >
      <Flame className="size-3.5" />
      {streak}
      {!reached && <span className="opacity-60">/{STREAK_GOAL}</span>}
    </span>
  );
}

// ============================================================================
// Composer (création / édition d'une routine)
// ============================================================================
type ComposerValue = {
  title: string;
  everyDay: boolean;
  days: number[];
  time: string;
  projectId: string | null;
};

function RoutineComposer({
  routine,
  projects,
  onCancel,
  onSave,
}: {
  routine?: Routine;
  projects: ProjectOpt[];
  onCancel: () => void;
  onSave: (v: ComposerValue) => void;
}) {
  const [title, setTitle] = useState(routine?.title ?? "");
  const [everyDay, setEveryDay] = useState(
    routine ? routine.frequency === "daily" : true,
  );
  const [days, setDays] = useState<number[]>(
    routine?.frequency === "weekly" ? routine.days_of_week ?? [] : [],
  );
  const [time, setTime] = useState((routine?.time_of_day ?? "").slice(0, 5));
  const [projectId, setProjectId] = useState<string>(routine?.project_id ?? NO_PROJECT);

  function submit() {
    if (!title.trim()) {
      toast.error("Donne un nom à la routine");
      return;
    }
    if (!everyDay && days.length === 0) {
      toast.error("Choisis « Tous les jours » ou au moins un jour");
      return;
    }
    onSave({
      title,
      everyDay,
      days,
      time,
      projectId: projectId === NO_PROJECT ? null : projectId,
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {routine ? "Modifier la routine" : "Nouvelle routine"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Fermer"
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>

      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="Ex. Méditation, Sport, Lecture…"
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Récurrence</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={everyDay ? "default" : "outline"}
            onClick={() => {
              setEveryDay(true);
              setDays([]);
            }}
          >
            Tous les jours
          </Button>
          <span className="text-xs text-muted-foreground">ou</span>
          {DAYS.map((d) => {
            const on = !everyDay && days.includes(d.key);
            return (
              <Button
                key={d.key}
                type="button"
                size="sm"
                variant={on ? "default" : "outline"}
                onClick={() => {
                  setEveryDay(false);
                  setDays((prev) =>
                    prev.includes(d.key)
                      ? prev.filter((x) => x !== d.key)
                      : [...prev, d.key],
                  );
                }}
                className="w-9 px-0"
              >
                {d.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            Heure (optionnelle)
          </span>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-9 w-32"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Projet</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
          >
            <option value={NO_PROJECT}>Sans projet</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={submit} className="bg-primary text-white hover:bg-primary/90">
          {routine ? "Enregistrer" : "Créer"}
        </Button>
      </div>
    </div>
  );
}
