"use client";

import { use, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskRow } from "@/components/tasks/task-row";
import { PasteTasksDialog } from "@/components/tasks/paste-tasks-dialog";
import { RoutinesPanel } from "@/components/routines/routines-panel";
import {
  useProject,
  useTasks,
  useProfiles,
  useCreateTask,
  useRealtimeTasks,
} from "@/lib/queries";

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
  const [newTitle, setNewTitle] = useState("");

  // Sync temps réel : les changements (ajouts, statuts, assignés, suppressions)
  // faits par d'autres utilisateurs apparaissent sans refresh.
  useRealtimeTasks(id);

  async function handleQuickAdd() {
    if (!newTitle.trim()) return;
    await createTask.mutateAsync({
      project_id: id,
      title: newTitle.trim(),
      position: tasks.length,
    });
    setNewTitle("");
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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            {tasks.length} tâche{tasks.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PasteTasksDialog
            projectId={id}
            profiles={profiles}
            basePosition={tasks.length}
          />
          <RoutinesPanel projectId={id} profiles={profiles} />
        </div>
      </header>

      {/* DESKTOP TABLE HEADER */}
      <div className="hidden border-b bg-muted/30 px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase md:flex md:items-center md:gap-3">
        <span className="size-5 shrink-0" />
        <span className="flex-1">Titre</span>
        <span className="w-44 shrink-0">Assignés</span>
        <span className="w-32 shrink-0">Statut</span>
        <span className="w-36 shrink-0">Échéance</span>
        <span className="w-8 shrink-0" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loadingTasks ? (
          <div className="p-6 text-sm text-muted-foreground">Chargement…</div>
        ) : tasks.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Aucune tâche pour l&apos;instant.
          </div>
        ) : (
          tasks.map((t) => (
            <TaskRow key={t.id} task={t} projectId={id} profiles={profiles} />
          ))
        )}

        {/* Quick add row */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleQuickAdd();
          }}
          className="flex items-center gap-2 px-3 py-2"
        >
          <Plus className="size-4 text-muted-foreground" />
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ajouter une tâche…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="sm" disabled={!newTitle.trim()}>
            Ajouter
          </Button>
        </form>
      </div>
    </div>
  );
}
