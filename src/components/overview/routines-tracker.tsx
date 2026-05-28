"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Repeat } from "lucide-react";
import type { Routine } from "@/lib/queries";

type Project = { id: string; name: string; color: string };

const FREQ_LABEL = {
  daily: "Quotidien",
  weekly: "Hebdo",
  monthly: "Mensuel",
} as const;

export function RoutinesTracker({
  routines,
  projects,
}: {
  routines: Routine[];
  projects: Project[];
}) {
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const today = new Date().toISOString().slice(0, 10);

  const active = routines.filter((r) => r.active);

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
            <Repeat className="size-4" />
          </span>
          Routines actives
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {active.length}
        </span>
      </header>
      {active.length === 0 ? (
        <div className="p-6 text-center text-sm italic text-muted-foreground">
          Aucune routine active. Configure-les depuis un projet.
        </div>
      ) : (
        <ul className="divide-y">
          {active.map((r) => {
            const proj = r.project_id ? projectsById.get(r.project_id) : undefined;
            const doneToday = r.last_generated_date === today;
            return (
              <li
                key={r.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30"
              >
                {doneToday ? (
                  <span
                    className="inline-flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                    title="Générée aujourd'hui"
                  >
                    <CheckCircle2 className="size-4" />
                  </span>
                ) : (
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Circle className="size-4" />
                  </span>
                )}

                <Link
                  href={proj ? `/app/projects/${proj.id}` : "#"}
                  className="flex min-w-0 flex-1 flex-col"
                >
                  <span className="truncate text-sm font-medium">{r.title}</span>
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
                </Link>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 ring-1 ring-purple-200">
                    {FREQ_LABEL[r.frequency]}
                  </span>
                  {r.time_of_day && (
                    <span className="rounded-md border bg-background px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                      {r.time_of_day.slice(0, 5)}
                    </span>
                  )}
                  {doneToday && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      ✓ Aujourd&apos;hui
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
