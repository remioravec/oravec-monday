"use client";

import { useState } from "react";
import { Calendar, Check, Clock, Repeat, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUpdateProject } from "@/lib/queries";
import type { Database, RoutineFrequency } from "@/lib/supabase/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const FREQ_LABEL: Record<RoutineFrequency, string> = {
  daily: "Quotidien",
  weekly: "Hebdo",
  monthly: "Mensuel",
};

export function RecurrenceHeader({ project }: { project: Project }) {
  const update = useUpdateProject();
  const [editing, setEditing] = useState(false);
  const [frequency, setFrequency] = useState<RoutineFrequency>(
    project.recurrence_frequency ?? "daily",
  );
  const [days, setDays] = useState<number[]>(
    project.recurrence_days_of_week ?? [1, 2, 3, 4, 5],
  );
  const [dayOfMonth, setDayOfMonth] = useState<number>(
    project.recurrence_day_of_month ?? 1,
  );
  const [time, setTime] = useState<string>(
    project.recurrence_time_of_day?.slice(0, 5) ?? "09:00",
  );

  const configured = !!project.recurrence_frequency;

  function summary() {
    if (!configured) return "Récurrence non configurée";
    const f = project.recurrence_frequency!;
    const t = project.recurrence_time_of_day?.slice(0, 5) ?? "—";
    if (f === "daily") return `Tous les jours à ${t}`;
    if (f === "weekly") {
      const ds = (project.recurrence_days_of_week ?? [])
        .map((i) => DAYS[i % 7])
        .join(" ");
      return `Chaque semaine (${ds || "—"}) à ${t}`;
    }
    return `Le ${project.recurrence_day_of_month ?? "?"} du mois à ${t}`;
  }

  async function save() {
    try {
      await update.mutateAsync({
        id: project.id,
        recurrence_frequency: frequency,
        recurrence_days_of_week: frequency === "weekly" ? days : null,
        recurrence_day_of_month: frequency === "monthly" ? dayOfMonth : null,
        recurrence_time_of_day: time + ":00",
      });
      toast.success("Récurrence enregistrée");
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="mx-3 mt-3 overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 shadow-sm sm:mx-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-purple-100 text-purple-700">
            <Repeat className="size-4" />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-purple-700">
              Routine
            </div>
            <div className="text-sm text-foreground">{summary()}</div>
          </div>
        </div>
        {!editing && (
          <Button
            size="sm"
            variant="outline"
            className="border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
            onClick={() => setEditing(true)}
          >
            {configured ? "Modifier" : "Configurer"}
          </Button>
        )}
      </div>

      {editing && (
        <div className="flex flex-col gap-4 border-t border-purple-200 bg-white/60 px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">Fréquence</span>
            <div className="inline-flex rounded-lg border bg-white p-0.5 text-xs">
              {(["daily", "weekly", "monthly"] as RoutineFrequency[]).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`rounded-md px-3 py-1.5 font-medium ${
                    frequency === f
                      ? "bg-purple-600 text-white"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {FREQ_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          {frequency === "weekly" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Jours
              </span>
              {DAYS.map((d, i) => {
                const idx = (i + 1) % 7; // L=1..D=0
                const on = days.includes(idx);
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() =>
                      setDays((cur) =>
                        cur.includes(idx)
                          ? cur.filter((x) => x !== idx)
                          : [...cur, idx].sort(),
                      )
                    }
                    className={`size-8 rounded-full text-xs font-semibold transition-colors ${
                      on
                        ? "bg-purple-600 text-white"
                        : "bg-white text-muted-foreground ring-1 ring-border hover:bg-muted"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          )}

          {frequency === "monthly" && (
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">
                Jour du mois
              </span>
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) =>
                  setDayOfMonth(Math.min(31, Math.max(1, Number(e.target.value))))
                }
                className="h-9 w-20 rounded-md border border-input bg-white px-2 text-sm"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Clock className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">
              Heure
            </span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-9 w-28 rounded-md border border-input bg-white px-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={save}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              <Check className="size-3.5" />
              Enregistrer
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              <X className="size-3.5" />
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
