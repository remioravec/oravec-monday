"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Trash2,
  MoreHorizontal,
  Plus,
  Maximize2,
  Paperclip,
  AlignLeft,
} from "lucide-react";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AssigneesPopover,
  AssigneesStack,
} from "@/components/tasks/assignees-popover";
import { StatusPill } from "@/components/tasks/status-pill";
import {
  useTaskAssignees,
  useToggleAssignee,
  useUpdateTask,
  useDeleteTask,
  useSubtasks,
  useCreateTask,
  useUpdateSubtask,
  type Profile,
  type Task,
} from "@/lib/queries";
import type { TaskStatus } from "@/lib/supabase/database.types";

function dateInputValue(iso: string | null) {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export function TaskRow({
  task,
  projectId,
  profiles,
  selected = false,
  onToggleSelect,
  attachmentCount = 0,
}: {
  task: Task;
  projectId: string;
  profiles: Profile[];
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  attachmentCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const { data: assigneeIds = [] } = useTaskAssignees(task.id);
  const toggleAssignee = useToggleAssignee();
  const { data: subtasks = [] } = useSubtasks(expanded ? task.id : undefined);
  const createTask = useCreateTask();

  const doneSub = subtasks.filter((s) => s.status === "fait").length;
  const subProgress = subtasks.length > 0 ? `${doneSub}/${subtasks.length}` : null;

  async function handleAddSubtask() {
    const title = window.prompt("Titre de la sous-tâche ?");
    if (!title?.trim()) return;
    await createTask.mutateAsync({
      project_id: projectId,
      parent_task_id: task.id,
      title: title.trim(),
      position: subtasks.length,
    });
    setExpanded(true);
  }

  return (
    <>
      {/* DESKTOP ROW */}
      <div
        className={[
          "hidden border-b last:border-b-0 md:flex md:items-center md:gap-3 md:px-3 md:py-2",
          selected ? "bg-blue-50/60" : "md:hover:bg-muted/30",
        ].join(" ")}
      >
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(task.id)}
            className="size-4 shrink-0 cursor-pointer rounded border-input accent-blue-600"
            aria-label="Sélectionner la tâche"
          />
        )}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="grid size-5 shrink-0 place-items-center text-muted-foreground"
          aria-label={expanded ? "Replier" : "Déplier"}
        >
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>

        <InlineTitle
          value={task.title}
          onChange={(v) => updateTask.mutate({ id: task.id, title: v })}
          className="flex-1"
          extra={subProgress}
        />

        <div className="w-44 shrink-0">
          <AssigneesPopover
            assigneeIds={assigneeIds}
            profiles={profiles}
            onToggle={(uid, on) =>
              toggleAssignee.mutate({ taskId: task.id, userId: uid, assign: on })
            }
          />
        </div>

        <div className="w-32 shrink-0">
          <StatusPill
            status={task.status as TaskStatus}
            onChange={(s) => updateTask.mutate({ id: task.id, status: s })}
          />
        </div>

        <div className="flex w-36 shrink-0 flex-col gap-1">
          <Input
            type="date"
            value={dateInputValue(task.due_date)}
            onChange={(e) =>
              updateTask.mutate({
                id: task.id,
                due_date: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
            className="h-7 px-2 text-xs"
          />
          {task.due_date && (
            <Input
              type="time"
              value={task.time_of_day ? task.time_of_day.slice(0, 5) : ""}
              onChange={(e) =>
                updateTask.mutate({
                  id: task.id,
                  time_of_day: e.target.value ? e.target.value + ":00" : null,
                })
              }
              className="h-6 px-2 text-[11px]"
            />
          )}
        </div>

        <RowActions
          onAddSubtask={handleAddSubtask}
          onOpenDetail={() => setDetailOpen(true)}
          onDelete={() =>
            window.confirm(`Supprimer "${task.title}" ?`) &&
            deleteTask.mutate({ id: task.id })
          }
          hasDescription={!!task.description}
          attachmentCount={attachmentCount}
        />
      </div>

      {/* MOBILE CARD */}
      <div
        className={[
          "md:hidden flex flex-col gap-3 border-b p-3 last:border-b-0",
          selected ? "bg-blue-50/60" : "",
        ].join(" ")}
      >
        <div className="flex items-start gap-2">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(task.id)}
              className="size-4 shrink-0 cursor-pointer rounded border-input accent-blue-600"
              aria-label="Sélectionner la tâche"
            />
          )}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="grid size-5 shrink-0 place-items-center text-muted-foreground"
            aria-label={expanded ? "Replier" : "Déplier"}
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
          <InlineTitle
            value={task.title}
            onChange={(v) => updateTask.mutate({ id: task.id, title: v })}
            className="flex-1"
            extra={subProgress}
          />
          <RowActions
            onAddSubtask={handleAddSubtask}
            onOpenDetail={() => setDetailOpen(true)}
            onDelete={() =>
              window.confirm(`Supprimer "${task.title}" ?`) &&
              deleteTask.mutate({ id: task.id })
            }
            hasDescription={!!task.description}
            attachmentCount={attachmentCount}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-7">
          <StatusPill
            status={task.status as TaskStatus}
            onChange={(s) => updateTask.mutate({ id: task.id, status: s })}
            size="sm"
          />
          <Input
            type="date"
            value={dateInputValue(task.due_date)}
            onChange={(e) =>
              updateTask.mutate({
                id: task.id,
                due_date: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
            className="h-7 w-36 px-2 text-xs"
          />
          {assigneeIds.length > 0 ? (
            <AssigneesStack
              assigneeIds={assigneeIds}
              profiles={profiles}
              max={3}
            />
          ) : (
            <AssigneesPopover
              assigneeIds={assigneeIds}
              profiles={profiles}
              onToggle={(uid, on) =>
                toggleAssignee.mutate({
                  taskId: task.id,
                  userId: uid,
                  assign: on,
                })
              }
            />
          )}
        </div>
      </div>

      {/* SUBTASKS */}
      {expanded && (
        <div className="border-b bg-muted/20 md:pl-10">
          {subtasks.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground italic">
              Aucune sous-tâche.{" "}
              <button
                type="button"
                onClick={handleAddSubtask}
                className="underline hover:text-foreground"
              >
                Ajouter
              </button>
            </div>
          )}
          {subtasks.map((st) => (
            <SubtaskRow
              key={st.id}
              task={st}
              projectId={projectId}
              parentId={task.id}
              profiles={profiles}
            />
          ))}
          {subtasks.length > 0 && (
            <button
              type="button"
              onClick={handleAddSubtask}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted/40"
            >
              <Plus className="size-3.5" />
              Ajouter une sous-tâche
            </button>
          )}
        </div>
      )}

      <TaskDetailDrawer
        task={task}
        projectId={projectId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}

function SubtaskRow({
  task,
  projectId,
  parentId,
  profiles,
}: {
  task: Task;
  projectId: string;
  parentId: string;
  profiles: Profile[];
}) {
  const updateSubtask = useUpdateSubtask(parentId, projectId);
  const deleteTask = useDeleteTask(projectId);
  const { data: assigneeIds = [] } = useTaskAssignees(task.id);
  const toggleAssignee = useToggleAssignee();

  return (
    <div className="flex flex-col gap-2 border-b border-dashed border-border/60 px-3 py-2 last:border-b-0 md:flex-row md:items-center md:gap-3">
      <InlineTitle
        value={task.title}
        onChange={(v) => updateSubtask.mutate({ id: task.id, title: v })}
        className="flex-1"
      />
      <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:gap-3">
        <div className="w-36 md:w-44">
          <AssigneesPopover
            assigneeIds={assigneeIds}
            profiles={profiles}
            onToggle={(uid, on) =>
              toggleAssignee.mutate({ taskId: task.id, userId: uid, assign: on })
            }
          />
        </div>
        <StatusPill
          status={task.status as TaskStatus}
          onChange={(s) => updateSubtask.mutate({ id: task.id, status: s })}
          size="sm"
        />
        <Input
          type="date"
          value={dateInputValue(task.due_date)}
          onChange={(e) =>
            updateSubtask.mutate({
              id: task.id,
              due_date: e.target.value
                ? new Date(e.target.value).toISOString()
                : null,
            })
          }
          className="h-7 w-32 px-2 text-xs"
        />
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Supprimer la sous-tâche"
          onClick={() =>
            deleteTask.mutate({ id: task.id, parent_task_id: parentId })
          }
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

function RowActions({
  onAddSubtask,
  onOpenDetail,
  onDelete,
  hasDescription,
  attachmentCount = 0,
}: {
  onAddSubtask: () => void;
  onOpenDetail: () => void;
  onDelete: () => void;
  hasDescription?: boolean;
  attachmentCount?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {hasDescription && (
        <button
          type="button"
          onClick={onOpenDetail}
          className="grid size-6 place-items-center text-muted-foreground hover:text-foreground"
          title="Cette tâche a une description"
          aria-label="Description"
        >
          <AlignLeft className="size-3" />
        </button>
      )}
      {attachmentCount > 0 && (
        <button
          type="button"
          onClick={onOpenDetail}
          className="inline-flex h-6 items-center gap-0.5 rounded-md px-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title={`${attachmentCount} pièce(s) jointe(s)`}
          aria-label={`${attachmentCount} pièces jointes`}
        >
          <Paperclip className="size-3" />
          <span className="text-[10px] tabular-nums">{attachmentCount}</span>
        </button>
      )}
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onOpenDetail}
        aria-label="Ouvrir le détail"
        title="Ouvrir le détail"
      >
        <Maximize2 className="size-3.5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button size="icon-sm" variant="ghost" aria-label="Plus" />}
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onOpenDetail}>
            <Paperclip className="size-3.5" />
            Description & pièces jointes
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddSubtask}>
            <Plus className="size-3.5" />
            Ajouter une sous-tâche
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="size-3.5" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function InlineTitle({
  value,
  onChange,
  className,
  extra,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  extra?: string | null;
}) {
  // draft === null → view mode (display `value`)
  // draft is a string → edit mode with that draft.
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    const next = (draft ?? "").trim();
    if (next && next !== value) onChange(next);
    setDraft(null);
  }

  if (draft !== null) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setDraft(null);
        }}
        className={`h-7 px-2 text-sm ${className ?? ""}`}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setDraft(value)}
      className={`truncate text-left text-sm ${className ?? ""}`}
    >
      <span>{value}</span>
      {extra && (
        <span className="ml-2 text-xs text-muted-foreground tabular-nums">
          ({extra})
        </span>
      )}
    </button>
  );
}
