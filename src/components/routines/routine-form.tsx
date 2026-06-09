"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useUpsertRoutine,
  useRoutineAssignees,
  type Profile,
  type Routine,
  type RoutineFormInput,
} from "@/lib/queries";
import { AssigneeAvatar } from "@/components/tasks/assignees-popover";
import type { RoutineFrequency } from "@/lib/supabase/database.types";

const DAYS = [
  { key: 1, label: "L" },
  { key: 2, label: "Ma" },
  { key: 3, label: "Me" },
  { key: 4, label: "J" },
  { key: 5, label: "V" },
  { key: 6, label: "S" },
  { key: 0, label: "D" },
];

export function RoutineFormDialog({
  projectId,
  profiles,
  routine,
  open,
  onOpenChange,
}: {
  projectId: string;
  profiles: Profile[];
  routine?: Routine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {routine ? "Modifier la routine" : "Nouvelle routine"}
          </DialogTitle>
          <DialogDescription>
            Objectif récurrent cochable : il apparaît dans « Routines du jour »
            selon sa fréquence.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RoutineFormLoader
            key={routine?.id ?? "new"}
            projectId={projectId}
            profiles={profiles}
            routine={routine ?? null}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoutineFormLoader({
  projectId,
  profiles,
  routine,
  onDone,
}: {
  projectId: string;
  profiles: Profile[];
  routine: Routine | null;
  onDone: () => void;
}) {
  const { data: existingAssignees, isPending } = useRoutineAssignees(
    routine?.id ?? undefined,
  );

  // Pas d'edit en cours → on rend tout de suite avec assignees vides.
  // Edit en cours → on attend que la query résolve pour avoir l'état initial.
  if (routine && isPending) {
    return (
      <div className="py-4 text-sm text-muted-foreground">Chargement…</div>
    );
  }

  return (
    <RoutineFormBody
      projectId={projectId}
      profiles={profiles}
      routine={routine}
      initialAssignees={existingAssignees ?? []}
      onDone={onDone}
    />
  );
}

function RoutineFormBody({
  projectId,
  profiles,
  routine,
  initialAssignees,
  onDone,
}: {
  projectId: string;
  profiles: Profile[];
  routine: Routine | null;
  initialAssignees: string[];
  onDone: () => void;
}) {
  const upsert = useUpsertRoutine();
  const [title, setTitle] = useState(routine?.title ?? "");
  const [description, setDescription] = useState(routine?.description ?? "");
  const [frequency, setFrequency] = useState<RoutineFrequency>(
    routine?.frequency ?? "daily",
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    routine?.days_of_week ?? [],
  );
  const [dayOfMonth, setDayOfMonth] = useState<number>(
    routine?.day_of_month ?? 1,
  );
  const [timeOfDay, setTimeOfDay] = useState(
    (routine?.time_of_day ?? "09:00").slice(0, 5),
  );
  const [active, setActive] = useState(routine?.active ?? true);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialAssignees);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const payload: RoutineFormInput & { id?: string } = {
      id: routine?.id,
      project_id: projectId,
      title: title.trim(),
      description: description.trim() || null,
      frequency,
      days_of_week: frequency === "weekly" ? daysOfWeek : null,
      day_of_month: frequency === "monthly" ? dayOfMonth : null,
      time_of_day: timeOfDay,
      active,
      assignee_ids: assigneeIds,
    };
    try {
      await upsert.mutateAsync(payload);
      toast.success(routine ? "Routine mise à jour" : "Routine créée");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="r-title">Titre</Label>
        <Input
          id="r-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="r-desc">Description (optionnelle)</Label>
        <textarea
          id="r-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-input bg-background p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Fréquence</Label>
        <div className="flex gap-1">
          {(
            [
              { v: "daily", l: "Quotidienne" },
              { v: "weekly", l: "Hebdomadaire" },
              { v: "monthly", l: "Mensuelle" },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.v}
              type="button"
              size="sm"
              variant={frequency === opt.v ? "default" : "outline"}
              onClick={() => setFrequency(opt.v)}
            >
              {opt.l}
            </Button>
          ))}
        </div>
      </div>

      {frequency === "weekly" && (
        <div className="flex flex-col gap-1.5">
          <Label>Jours</Label>
          <div className="flex flex-wrap gap-1">
            {DAYS.map((d) => {
              const on = daysOfWeek.includes(d.key);
              return (
                <Button
                  key={d.key}
                  type="button"
                  size="sm"
                  variant={on ? "default" : "outline"}
                  onClick={() =>
                    setDaysOfWeek((prev) =>
                      on ? prev.filter((x) => x !== d.key) : [...prev, d.key],
                    )
                  }
                  className="w-9 px-0"
                >
                  {d.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {frequency === "monthly" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-day">Jour du mois (1–31)</Label>
          <Input
            id="r-day"
            type="number"
            min={1}
            max={31}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Number(e.target.value || 1))}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="r-time">Heure</Label>
        <Input
          id="r-time"
          type="time"
          value={timeOfDay}
          onChange={(e) => setTimeOfDay(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Assignés</Label>
        <div className="flex flex-wrap gap-1.5">
          {profiles.map((p) => {
            const on = assigneeIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setAssigneeIds((prev) =>
                    on ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                  )
                }
                className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors ${
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input"
                }`}
              >
                <AssigneeAvatar profile={p} />
                {p.full_name ?? "Sans nom"}
              </button>
            );
          })}
          {profiles.length === 0 && (
            <span className="text-xs text-muted-foreground">
              Aucun profil. Invite des collaborateurs.
            </span>
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4"
        />
        Routine active
      </label>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Annuler
        </DialogClose>
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? "…" : "Enregistrer"}
        </Button>
      </DialogFooter>
    </form>
  );
}
