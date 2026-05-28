"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addWeeks,
  differenceInDays,
  eachDayOfInterval,
  format,
  isToday,
  parseISO,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { statusColor, statusLabel } from "@/components/tasks/status-pill";
import type { TaskStatus } from "@/lib/supabase/database.types";
import {
  useDeleteTask,
  useTaskAssignees,
  useToggleAssignee,
  useUpdateTask,
  type Profile,
  type Task,
} from "@/lib/queries";

const STATUSES: TaskStatus[] = ["a_faire", "en_cours", "fait"];

const WEEKS_TO_SHOW = 4;
const DAY_PX = 32;

export function ProjectGantt({
  tasks,
  projectId,
  profiles,
}: {
  tasks: Task[];
  projectId: string;
  profiles: Profile[];
}) {
  const [cursor, setCursor] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: cursor,
        end: addDays(cursor, WEEKS_TO_SHOW * 7 - 1),
      }),
    [cursor],
  );

  const dated = tasks
    .filter((t) => t.due_date && !t.parent_task_id)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {format(cursor, "d MMM", { locale: fr })} →{" "}
          {format(addDays(cursor, WEEKS_TO_SHOW * 7 - 1), "d MMM yyyy", {
            locale: fr,
          })}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => setCursor((c) => subWeeks(c, 2))}
          >
            <ChevronLeft />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setCursor(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            Aujourd&apos;hui
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => setCursor((c) => addWeeks(c, 2))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {dated.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          Aucune tâche avec date pour afficher en Gantt.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
          <div className="inline-block min-w-full">
            {/* Header */}
            <div className="flex border-b bg-muted/30">
              <div className="sticky left-0 z-10 w-56 shrink-0 border-r bg-muted/30 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                Tâche
              </div>
              <div className="flex">
                {days.map((d) => (
                  <div
                    key={d.toISOString()}
                    className={[
                      "shrink-0 border-r text-center text-[10px]",
                      isToday(d)
                        ? "bg-accent font-semibold text-accent-foreground"
                        : "text-muted-foreground",
                    ].join(" ")}
                    style={{ width: DAY_PX }}
                  >
                    <div className="pt-1.5">
                      {format(d, "EEE", { locale: fr }).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="pb-1.5 tabular-nums">{format(d, "d")}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {dated.map((t) => {
              const due = parseISO(t.due_date!);
              const offset = differenceInDays(due, cursor);
              const visible = offset >= 0 && offset < days.length;
              return (
                <div
                  key={t.id}
                  className="flex border-t border-dashed border-border/60 bg-background"
                >
                  <div className="sticky left-0 z-10 w-56 shrink-0 border-r bg-background px-3 py-2 text-xs">
                    <span className="block truncate">{t.title}</span>
                  </div>
                  <div
                    className="relative"
                    style={{ width: days.length * DAY_PX, height: 32 }}
                  >
                    {days.map((d) => (
                      <div
                        key={d.toISOString()}
                        className={[
                          "absolute top-0 h-full border-r",
                          isToday(d) ? "bg-accent/50" : "",
                        ].join(" ")}
                        style={{
                          left: differenceInDays(d, cursor) * DAY_PX,
                          width: DAY_PX,
                        }}
                      />
                    ))}
                    {visible && (
                      <GanttBar
                        task={t}
                        projectId={projectId}
                        profiles={profiles}
                        offset={offset}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GanttBar({
  task,
  projectId,
  profiles,
  offset,
}: {
  task: Task;
  projectId: string;
  profiles: Profile[];
  offset: number;
}) {
  const update = useUpdateTask(projectId);
  const remove = useDeleteTask(projectId);
  const { data: assigneeIds = [] } = useTaskAssignees(task.id);
  const toggle = useToggleAssignee();
  const due = task.due_date ? parseISO(task.due_date) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="absolute top-1/2 flex h-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full px-2 text-[10px] font-medium text-white shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-ring"
            style={{
              left: offset * DAY_PX + 4,
              width: DAY_PX - 8,
              backgroundColor: statusColor(task.status as TaskStatus),
            }}
            aria-label={`${task.title} — ${due ? format(due, "EEE d MMM", { locale: fr }) : ""}`}
            title={task.title}
          />
        }
      />
      <DropdownMenuContent align="start" className="min-w-60">
        <DropdownMenuLabel className="line-clamp-1">
          {task.title}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Statut
        </DropdownMenuLabel>
        {STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() =>
              update.mutate({ id: task.id, status: s }, {
                onSuccess: () => toast.success(`Statut → ${statusLabel(s)}`),
              })
            }
            className="gap-2"
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: statusColor(s) }}
            />
            {statusLabel(s)}
            {task.status === s && (
              <span className="ml-auto text-[10px] text-muted-foreground">actuel</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          <Calendar className="mr-1 inline size-3" />
          Échéance
        </DropdownMenuLabel>
        <div className="px-2 py-1">
          <input
            type="date"
            value={due ? format(due, "yyyy-MM-dd") : ""}
            onChange={(e) =>
              update.mutate({
                id: task.id,
                due_date: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Assignés
        </DropdownMenuLabel>
        <div className="max-h-44 overflow-y-auto">
          {profiles.map((p) => {
            const on = assigneeIds.includes(p.id);
            const initial = (p.full_name ?? "?").trim().charAt(0).toUpperCase();
            return (
              <DropdownMenuItem
                key={p.id}
                onClick={() =>
                  toggle.mutate({
                    taskId: task.id,
                    userId: p.id,
                    assign: !on,
                  })
                }
                className="gap-2"
              >
                <Avatar
                  className="size-5"
                  style={{ backgroundColor: p.color }}
                >
                  {p.avatar_url && (
                    <AvatarImage src={p.avatar_url} alt={p.full_name ?? ""} />
                  )}
                  <AvatarFallback
                    className="text-[10px] text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate">{p.full_name}</span>
                {on && (
                  <span className="text-[10px] text-primary">✓</span>
                )}
              </DropdownMenuItem>
            );
          })}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            if (window.confirm(`Supprimer "${task.title}" ?`)) {
              remove.mutate(
                { id: task.id },
                { onSuccess: () => toast.success("Supprimée") },
              );
            }
          }}
        >
          <Trash2 className="size-3.5" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
