"use client";

import Link from "next/link";
import { format, isToday, isWithinInterval, parseISO, startOfDay, endOfDay, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarClock, ListChecks } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusPill } from "@/components/tasks/status-pill";
import type { Profile, Task } from "@/lib/queries";
import type { TaskStatus } from "@/lib/supabase/database.types";

type Project = { id: string; name: string; color: string };

export function UpcomingTasks({
  tasks,
  projects,
  profiles,
  assigneesMap,
}: {
  tasks: Task[];
  projects: Project[];
  profiles: Profile[];
  assigneesMap: Map<string, string[]>;
}) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekEnd = endOfDay(addDays(now, 6));

  const isDone = (t: Task) => (t.status as TaskStatus) === "fait";
  const withDate = tasks.filter((t) => t.due_date && !isDone(t));

  const today = withDate.filter((t) => {
    const d = parseISO(t.due_date!);
    return isToday(d);
  });
  const week = withDate.filter((t) => {
    const d = parseISO(t.due_date!);
    return (
      isWithinInterval(d, { start: todayStart, end: weekEnd }) && !isToday(d)
    );
  });

  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <TasksColumn
        title="À faire aujourd'hui"
        icon={<CalendarClock className="size-4" />}
        accent="bg-orange-100 text-orange-700"
        tasks={today}
        projectsById={projectsById}
        profileById={profileById}
        assigneesMap={assigneesMap}
        emptyLabel="Rien de prévu aujourd'hui. Profite ☀️"
      />
      <TasksColumn
        title="Cette semaine"
        icon={<ListChecks className="size-4" />}
        accent="bg-blue-100 text-blue-700"
        tasks={week}
        projectsById={projectsById}
        profileById={profileById}
        assigneesMap={assigneesMap}
        emptyLabel="Rien dans les 7 prochains jours."
      />
    </div>
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
  emptyLabel,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  tasks: Task[];
  projectsById: Map<string, Project>;
  profileById: Map<string, Profile>;
  assigneesMap: Map<string, string[]>;
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
              <li key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30">
                <Link
                  href={proj ? `/app/projects/${proj.id}` : "#"}
                  className="flex min-w-0 flex-1 flex-col gap-0.5"
                >
                  <span className="truncate text-sm font-medium">{t.title}</span>
                  {proj && (
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: proj.color ?? "#94a3b8" }}
                      />
                      {proj.name}
                      <span className="text-muted-foreground/60">·</span>
                      {format(parseISO(t.due_date!), "EEE d MMM", { locale: fr })}
                    </span>
                  )}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill
                    status={t.status as TaskStatus}
                    onChange={() => {}}
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
          })}
        </ul>
      )}
    </section>
  );
}
