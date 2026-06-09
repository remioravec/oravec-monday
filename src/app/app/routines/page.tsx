"use client";

import { useState } from "react";
import { Repeat, Plus, Trash2, Pencil, Flame, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAllRoutines,
  useRoutineCompletions,
  useRoutineCompletionsSince,
  useToggleRoutineCompletion,
  useUpsertRoutine,
  useDeleteRoutine,
  type Routine,
} from "@/lib/queries";

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
  const { data: doneToday = EMPTY_SET } = useRoutineCompletions(todayStr);
  const { data: range } = useRoutineCompletionsSince(sinceStr);
  const toggle = useToggleRoutineCompletion();
  const upsert = useUpsertRoutine();
  const del = useDeleteRoutine();

  const [composer, setComposer] = useState<"new" | Routine | null>(null);

  const active = routines.filter((r) => r.active);
  // Dues du jour non faites d'abord, puis faites, puis les autres jours.
  const sorted = [...active].sort((a, b) => rank(a) - rank(b));
  function rank(r: Routine) {
    const due = isDue(r, now);
    const done = doneToday.has(r.id);
    if (due && !done) return 0;
    if (due && done) return 1;
    return 2;
  }

  const dueCount = active.filter((r) => isDue(r, now)).length;
  const doneCount = active.filter((r) => isDue(r, now) && doneToday.has(r.id)).length;

  async function save(input: ComposerValue, routine: Routine | null) {
    try {
      await upsert.mutateAsync({
        id: routine?.id,
        project_id: routine?.project_id ?? null,
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
        <ul className="flex flex-col gap-2.5">
          {sorted.map((r) =>
            composer !== null && typeof composer !== "string" && composer.id === r.id ? (
              <li key={r.id}>
                <RoutineComposer
                  routine={r}
                  onCancel={() => setComposer(null)}
                  onSave={(v) => save(v, r)}
                />
              </li>
            ) : (
              <RoutineCard
                key={r.id}
                routine={r}
                now={now}
                done={doneToday.has(r.id)}
                completions={range?.get(r.id)}
                onToggle={(done) =>
                  toggle.mutate({ routineId: r.id, day: todayStr, done })
                }
                onEdit={() => setComposer(r)}
                onDelete={() => {
                  if (window.confirm(`Supprimer la routine « ${r.title} » ?`)) {
                    del.mutate(r.id, {
                      onError: (e) => toast.error(e.message),
                    });
                  }
                }}
              />
            ),
          )}
        </ul>
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
type ComposerValue = { title: string; everyDay: boolean; days: number[]; time: string };

function RoutineComposer({
  routine,
  onCancel,
  onSave,
}: {
  routine?: Routine;
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

  function submit() {
    if (!title.trim()) {
      toast.error("Donne un nom à la routine");
      return;
    }
    if (!everyDay && days.length === 0) {
      toast.error("Choisis « Tous les jours » ou au moins un jour");
      return;
    }
    onSave({ title, everyDay, days, time });
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
