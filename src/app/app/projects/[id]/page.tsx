"use client";

import { use, useMemo, useState } from "react";
import { BarChart3, CalendarDays, ChevronDown, ChevronRight, LayoutGrid, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskRow } from "@/components/tasks/task-row";
import { PasteTasksDialog } from "@/components/tasks/paste-tasks-dialog";
import { RoutinesPanel } from "@/components/routines/routines-panel";
import { BoardToolbar, type GroupBy } from "@/components/tasks/board-toolbar";
import { BulkActionBar } from "@/components/tasks/bulk-action-bar";
import { RecurrenceHeader } from "@/components/routines/recurrence-header";
import { ProjectGantt } from "@/components/views/project-gantt";
import { statusLabel, statusColor } from "@/components/tasks/status-pill";
import {
  useProject,
  useTasks,
  useProfiles,
  useTasksAssigneesMap,
  useTasksAttachmentCounts,
  useCreateTask,
  useRealtimeTasks,
} from "@/lib/queries";
import type { TaskStatus } from "@/lib/supabase/database.types";

const STATUS_ORDER: TaskStatus[] = ["a_faire", "en_cours", "fait"];

type GroupRow = {
  key: string;
  label: string;
  color: string | null;
  defaultStatus?: TaskStatus;
  tasks: Awaited<ReturnType<typeof useTasks>>["data"] extends (infer T)[] | undefined
    ? T[]
    : never;
};

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: project, isLoading: loadingProject } = useProject(id);
  const { data: tasks = [], isLoading: loadingTasks } = useTasks(id);
  const { data: profiles = [] } = useProfiles();
  const createTask = useCreateTask();

  // Sync temps réel : les changements (ajouts, statuts, assignés, suppressions)
  // faits par d'autres utilisateurs apparaissent sans refresh.
  useRealtimeTasks(id);

  const [view, setView] = useState<"board" | "gantt">("board");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelect(taskId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }
  function selectAll(ids: string[], shouldSelect: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shouldSelect) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  }

  const assigneesMap = useTasksAssigneesMap(tasks.map((t) => t.id));
  const attachmentCounts = useTasksAttachmentCounts(tasks.map((t) => t.id));

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (assigneeFilter.length > 0) {
        const ids = assigneesMap.get(t.id) ?? [];
        if (!ids.some((uid) => assigneeFilter.includes(uid))) return false;
      }
      return true;
    });
  }, [tasks, search, assigneeFilter, assigneesMap]);

  const groups = useMemo<GroupRow[]>(() => {
    if (groupBy === "status") {
      return STATUS_ORDER.map((s) => ({
        key: s,
        label: statusLabel(s),
        color: statusColor(s),
        defaultStatus: s,
        tasks: filteredTasks.filter((t) => (t.status as TaskStatus) === s),
      }));
    }
    if (groupBy === "assignee") {
      const out: GroupRow[] = [];
      const seen = new Set<string>();
      for (const p of profiles) {
        const ts = filteredTasks.filter((t) =>
          (assigneesMap.get(t.id) ?? []).includes(p.id),
        );
        if (ts.length > 0) {
          out.push({ key: p.id, label: p.full_name ?? "Sans nom", color: p.color, tasks: ts });
          ts.forEach((t) => seen.add(t.id));
        }
      }
      const unassigned = filteredTasks.filter((t) => !seen.has(t.id));
      if (unassigned.length > 0) {
        out.push({
          key: "_none",
          label: "Non assigné",
          color: "#94a3b8",
          tasks: unassigned,
        });
      }
      return out;
    }
    return [
      {
        key: "all",
        label: "Toutes les tâches",
        color: null,
        tasks: filteredTasks,
      },
    ];
  }, [groupBy, filteredTasks, profiles, assigneesMap]);

  async function handleAdd(status?: TaskStatus) {
    const title = window.prompt("Titre de la tâche ?");
    if (!title?.trim()) return;
    await createTask.mutateAsync({
      project_id: id,
      title: title.trim(),
      status: status ?? "a_faire",
      position: tasks.length,
    });
  }

  if (loadingProject) {
    return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  }
  if (!project) {
    return (
      <div className="p-6">
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Projet introuvable.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header : titre + tabs */}
      <header className="flex flex-col gap-2 border-b bg-background px-4 pt-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: project.color ?? "#2563eb" }}
            />
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <button
              type="button"
              className="text-muted-foreground hover:text-yellow-500"
              aria-label="Favori"
              title="Bientôt"
            >
              <Star className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PasteTasksDialog
              projectId={id}
              profiles={profiles}
              basePosition={tasks.length}
            />
            <RoutinesPanel projectId={id} profiles={profiles} />
          </div>
        </div>
        <nav className="-mx-1 flex items-center gap-0.5 overflow-x-auto pb-1 text-sm">
          <TabButton active={view === "board"} onClick={() => setView("board")}>
            <LayoutGrid className="size-3.5" />
            Tableau
          </TabButton>
          <TabButton active={view === "gantt"} onClick={() => setView("gantt")}>
            <BarChart3 className="size-3.5" />
            Gantt
          </TabButton>
          <TabButton disabled>
            <CalendarDays className="size-3.5" />
            Calendrier (bientôt)
          </TabButton>
        </nav>
      </header>

      {project.is_routine && <RecurrenceHeader project={project} />}

      {view === "gantt" ? (
        <div className="flex-1 overflow-y-auto bg-muted/20">
          <ProjectGantt tasks={tasks} projectId={id} profiles={profiles} />
        </div>
      ) : (
        <>
      <BoardToolbar
        onAdd={() => handleAdd()}
        search={search}
        onSearchChange={setSearch}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
        profiles={profiles}
      />

      <BulkActionBar
        projectId={id}
        selectedIds={Array.from(selectedIds)}
        onClear={() => setSelectedIds(new Set())}
        profiles={profiles}
      />

      <div className="flex-1 overflow-y-auto bg-muted/20">
        {loadingTasks ? (
          <div className="p-6 text-sm text-muted-foreground">Chargement…</div>
        ) : tasks.length === 0 ? (
          <EmptyState onAdd={() => handleAdd()} />
        ) : (
          <div className="flex flex-col gap-4 p-3 sm:p-4">
            {groups.map((g) => (
              <GroupSection
                key={g.key}
                group={g}
                projectId={id}
                profiles={profiles}
                open={collapsed[g.key] !== true}
                onToggle={() =>
                  setCollapsed((s) => ({ ...s, [g.key]: !(s[g.key] === true) }))
                }
                onAdd={() => handleAdd(g.defaultStatus)}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onSelectAll={selectAll}
                attachmentCounts={attachmentCounts}
              />
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}

function TabButton({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "text-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary"
          : "text-muted-foreground hover:text-foreground",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function GroupSection({
  group,
  projectId,
  profiles,
  open,
  onToggle,
  onAdd,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  attachmentCounts,
}: {
  group: GroupRow;
  projectId: string;
  profiles: ReturnType<typeof useProfiles>["data"] extends (infer T)[] | undefined
    ? T[]
    : never;
  open: boolean;
  onToggle: () => void;
  onAdd: () => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[], shouldSelect: boolean) => void;
  attachmentCounts: Map<string, number>;
}) {
  const accent = group.color ?? "#94a3b8";
  const groupTaskIds = group.tasks.map((t) => t.id);
  const allSelected =
    groupTaskIds.length > 0 && groupTaskIds.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && groupTaskIds.some((id) => selectedIds.has(id));

  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <header
        className="flex items-center gap-2 border-l-4 bg-background/80 px-3 py-2"
        style={{ borderLeftColor: accent }}
      >
        <button
          type="button"
          onClick={onToggle}
          className="grid size-5 place-items-center text-muted-foreground"
          aria-label={open ? "Replier" : "Déplier"}
        >
          {open ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {group.label}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {group.tasks.length} élément{group.tasks.length > 1 ? "s" : ""}
        </span>
      </header>

      {open && (
        <>
          {/* Column headers (desktop) */}
          <div className="hidden border-b bg-muted/30 px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase md:flex md:items-center md:gap-3">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={(e) => onSelectAll(groupTaskIds, e.target.checked)}
              className="size-4 shrink-0 cursor-pointer rounded border-input accent-primary"
              aria-label="Tout sélectionner dans le groupe"
              disabled={groupTaskIds.length === 0}
            />
            <span className="size-5 shrink-0" />
            <span className="flex-1">Élément</span>
            <span className="w-44 shrink-0">Assignés</span>
            <span className="w-32 shrink-0">Statut</span>
            <span className="w-36 shrink-0">Échéance</span>
            <span className="w-8 shrink-0" />
          </div>

          {group.tasks.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs italic text-muted-foreground">
              Aucun élément dans ce groupe.
            </div>
          ) : (
            group.tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                projectId={projectId}
                profiles={profiles}
                selected={selectedIds.has(t.id)}
                onToggleSelect={onToggleSelect}
                attachmentCount={attachmentCounts.get(t.id) ?? 0}
              />
            ))
          )}

          <button
            type="button"
            onClick={onAdd}
            className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted/40"
          >
            <Plus className="size-3.5" />
            Ajouter élément
          </button>
        </>
      )}
    </section>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-accent text-primary">
        <Plus className="size-6" />
      </div>
      <p className="text-sm text-muted-foreground">
        Aucune tâche pour l&apos;instant.
      </p>
      <Button
        onClick={onAdd}
        className="bg-primary text-white hover:bg-primary/90"
      >
        <Plus className="size-3.5" />
        Ajouter la première tâche
      </Button>
    </div>
  );
}
