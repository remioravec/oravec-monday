"use client";

import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Pencil,
  Trash2,
  Repeat,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { RoutineFormDialog } from "./routine-form";
import {
  useRoutines,
  useDeleteRoutine,
  useToggleRoutineActive,
  type Profile,
  type Routine,
} from "@/lib/queries";

const DAY_SHORT = ["D", "L", "Ma", "Me", "J", "V", "S"];
const FREQ_LABEL = {
  daily: "Tous les jours",
  weekly: "Hebdo",
  monthly: "Mensuel",
} as const;

function describeRoutine(r: Routine) {
  if (r.frequency === "daily") return `Tous les jours à ${r.time_of_day?.slice(0, 5) ?? "09:00"}`;
  if (r.frequency === "weekly") {
    const days = (r.days_of_week ?? [])
      .slice()
      .sort()
      .map((d) => DAY_SHORT[d])
      .join(" ");
    return `${days || "—"} à ${r.time_of_day?.slice(0, 5) ?? "09:00"}`;
  }
  return `Le ${r.day_of_month ?? "?"} du mois à ${r.time_of_day?.slice(0, 5) ?? "09:00"}`;
}

export function RoutinesPanel({
  projectId,
  profiles,
}: {
  projectId: string;
  profiles: Profile[];
}) {
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);

  const { data: routines = [] } = useRoutines(projectId);
  const deleteRoutine = useDeleteRoutine(projectId);
  const toggleActive = useToggleRoutineActive(projectId);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(r: Routine) {
    setEditing(r);
    setFormOpen(true);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="outline" size="sm">
              <Repeat className="size-3.5" />
              Routines
              {routines.length > 0 && (
                <span className="ml-1 rounded-full bg-muted px-1.5 text-[0.65rem] font-semibold">
                  {routines.length}
                </span>
              )}
            </Button>
          }
        />
        <SheetContent side="right" className="!w-96 !max-w-[90vw]">
          <SheetHeader>
            <SheetTitle>Routines récurrentes</SheetTitle>
            <SheetDescription>
              Objectifs récurrents cochables, affichés dans « Routines du jour »
              selon leur fréquence.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <Button onClick={openNew} size="sm" className="mb-3 w-full">
              <Plus />
              Nouvelle routine
            </Button>
            {routines.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Aucune routine pour ce projet.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {routines.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col gap-2 rounded-lg border p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="grid size-8 shrink-0 place-items-center rounded-md bg-muted">
                        <CalendarIcon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.title}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] uppercase">
                            {FREQ_LABEL[r.frequency]}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {describeRoutine(r)}
                        </div>
                        {r.description && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {r.description}
                          </div>
                        )}
                      </div>
                      <label className="flex shrink-0 cursor-pointer items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={r.active}
                          onChange={(e) =>
                            toggleActive.mutate({
                              id: r.id,
                              active: e.target.checked,
                            })
                          }
                          className="size-4"
                        />
                        Actif
                      </label>
                    </div>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEdit(r)}
                        aria-label="Modifier"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          window.confirm(`Supprimer "${r.title}" ?`) &&
                          deleteRoutine.mutate(r.id, {
                            onError: (e) => toast.error(e.message),
                          })
                        }
                        aria-label="Supprimer"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <RoutineFormDialog
        projectId={projectId}
        profiles={profiles}
        routine={editing}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </>
  );
}
