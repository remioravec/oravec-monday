"use client";

import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Database } from "@/lib/supabase/database.types";
import type { Profile } from "@/lib/queries";

type Workload = Database["public"]["Views"]["person_workload"]["Row"];

export function ChildrenOverview({
  people,
  workload,
}: {
  people: Profile[];
  workload: Workload[];
}) {
  if (people.length === 0) return null;
  const workloadById = new Map(workload.map((w) => [w.user_id, w]));

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-pink-100 text-pink-700">
            <Users className="size-4" />
          </span>
          Personnes dont je suis responsable
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {people.length}
        </span>
      </header>
      <ul className="divide-y">
        {people.map((c) => {
          const wl = workloadById.get(c.id);
          const total = wl?.total ?? 0;
          const done = wl?.fait ?? 0;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const initial = (c.full_name ?? "?").trim().charAt(0).toUpperCase();
          return (
            <li
              key={c.id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30"
            >
              <Avatar
                className="size-10"
                style={{ backgroundColor: c.color }}
              >
                {c.avatar_url && (
                  <AvatarImage src={c.avatar_url} alt={c.full_name ?? ""} />
                )}
                <AvatarFallback
                  className="text-white"
                  style={{ backgroundColor: c.color }}
                >
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{c.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {total === 0
                    ? "Aucune tâche assignée"
                    : `${total} tâches · ${done} faites`}
                </div>
              </div>
              <div className="flex w-32 items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-semibold tabular-nums">
                  {pct}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
