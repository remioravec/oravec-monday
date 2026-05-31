"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Database, TaskStatus, RoutineFrequency } from "@/lib/supabase/database.types";

type Folder = Database["public"]["Tables"]["folders"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Routine = Database["public"]["Tables"]["routines"]["Row"];
type Workload = Database["public"]["Views"]["person_workload"]["Row"];

const sb = () => createClient();

// =================== KEYS ===================
export const qk = {
  me: ["me"] as const,
  profiles: ["profiles"] as const,
  folders: ["folders"] as const,
  projects: ["projects"] as const,
  project: (id: string) => ["project", id] as const,
  tasks: (projectId: string) => ["tasks", projectId] as const,
  subtasks: (parentId: string) => ["subtasks", parentId] as const,
  taskAssignees: (taskId: string) => ["task-assignees", taskId] as const,
  routines: (projectId: string) => ["routines", projectId] as const,
  routineAssignees: (routineId: string) => ["routine-assignees", routineId] as const,
  workload: ["workload"] as const,
};

// =================== ME / PROFILES ===================
export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: async () => {
      const { data, error } = await sb().auth.getUser();
      if (error) throw error;
      return data.user;
    },
    staleTime: 5 * 60_000,
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: qk.profiles,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await sb()
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyProfile() {
  const { data: user } = useMe();
  return useQuery({
    queryKey: ["my-profile", user?.id ?? null],
    enabled: !!user?.id,
    queryFn: async (): Promise<Profile | null> => {
      if (!user?.id) return null;
      const { data, error } = await sb()
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  const { data: user } = useMe();
  return useMutation({
    mutationFn: async (patch: {
      full_name?: string;
      avatar_url?: string | null;
      color?: string;
      onboarded_at?: string | null;
    }) => {
      if (!user?.id) throw new Error("Non authentifié");
      const { error } = await sb()
        .from("profiles")
        .update(patch)
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.profiles });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: qk.workload });
    },
  });
}

// =================== RESPONSIBILITIES (parent/child) ===================
export function useResponsibilities() {
  return useQuery({
    queryKey: ["responsibilities"],
    queryFn: async (): Promise<{ parent_id: string; child_id: string }[]> => {
      const { data, error } = await sb()
        .from("responsibilities")
        .select("parent_id,child_id");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleResponsibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      parentId,
      childId,
      link,
    }: {
      parentId: string;
      childId: string;
      link: boolean;
    }) => {
      if (link) {
        const { error } = await sb()
          .from("responsibilities")
          .insert({ parent_id: parentId, child_id: childId });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await sb()
          .from("responsibilities")
          .delete()
          .eq("parent_id", parentId)
          .eq("child_id", childId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["responsibilities"] }),
  });
}

// =================== HIDDEN ITEMS ===================
export function useHiddenItems() {
  const { data: user } = useMe();
  return useQuery({
    queryKey: ["hidden-items", user?.id ?? null],
    enabled: !!user?.id,
    queryFn: async (): Promise<{ folders: Set<string>; projects: Set<string>; tasks: Set<string> }> => {
      const empty = { folders: new Set<string>(), projects: new Set<string>(), tasks: new Set<string>() };
      if (!user?.id) return empty;
      const { data, error } = await sb()
        .from("hidden_items")
        .select("item_kind,item_id")
        .eq("user_id", user.id);
      if (error) throw error;
      const out = { folders: new Set<string>(), projects: new Set<string>(), tasks: new Set<string>() };
      for (const row of data ?? []) {
        if (row.item_kind === "folder") out.folders.add(row.item_id);
        else if (row.item_kind === "project") out.projects.add(row.item_id);
        else if (row.item_kind === "task") out.tasks.add(row.item_id);
      }
      return out;
    },
  });
}

export function useToggleHidden() {
  const qc = useQueryClient();
  const { data: user } = useMe();
  return useMutation({
    mutationFn: async ({
      kind,
      id,
      hide,
    }: {
      kind: "folder" | "project" | "task";
      id: string;
      hide: boolean;
    }) => {
      if (!user?.id) throw new Error("Non authentifié");
      if (hide) {
        const { error } = await sb()
          .from("hidden_items")
          .insert({ user_id: user.id, item_kind: kind, item_id: id });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await sb()
          .from("hidden_items")
          .delete()
          .eq("user_id", user.id)
          .eq("item_kind", kind)
          .eq("item_id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hidden-items"] });
    },
  });
}

// =================== FOLDERS ===================
export function useFolders() {
  const ws = useWorkspaceStore((s) => s.currentId);
  return useQuery({
    queryKey: [...qk.folders, ws],
    enabled: !!ws,
    queryFn: async (): Promise<Folder[]> => {
      const { data, error } = await sb()
        .from("folders")
        .select("*")
        .eq("workspace_id", ws!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  const ws = useWorkspaceStore((s) => s.currentId);
  return useMutation({
    mutationFn: async ({ name, position }: { name: string; position: number }) => {
      const { data, error } = await sb()
        .from("folders")
        .insert({ name, position, workspace_id: ws })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.folders }),
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Folder>) => {
      const { error } = await sb().from("folders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.folders }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.folders });
      qc.invalidateQueries({ queryKey: qk.projects });
    },
  });
}

export function useReorderFolders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: { id: string; position: number }[]) => {
      // Update sequentially to keep RLS-friendly; small N expected.
      for (const o of order) {
        const { error } = await sb()
          .from("folders")
          .update({ position: o.position })
          .eq("id", o.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.folders }),
  });
}

// =================== PROJECTS ===================
export function useProjects() {
  const ws = useWorkspaceStore((s) => s.currentId);
  return useQuery({
    queryKey: [...qk.projects, ws],
    enabled: !!ws,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await sb()
        .from("projects")
        .select("*")
        .eq("workspace_id", ws!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: id ? qk.project(id) : ["project", "noop"],
    enabled: !!id,
    queryFn: async (): Promise<Project | null> => {
      if (!id) return null;
      const { data, error } = await sb()
        .from("projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  const ws = useWorkspaceStore((s) => s.currentId);
  return useMutation({
    mutationFn: async (input: {
      name: string;
      folder_id: string | null;
      position: number;
      is_routine?: boolean;
    }) => {
      const { data, error } = await sb()
        .from("projects")
        .insert({ ...input, workspace_id: ws })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.projects }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Project>) => {
      const { error } = await sb().from("projects").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: qk.projects });
      qc.invalidateQueries({ queryKey: qk.project(vars.id) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.projects }),
  });
}

export function useReorderProjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      order: { id: string; position: number; folder_id: string | null }[],
    ) => {
      for (const o of order) {
        const { error } = await sb()
          .from("projects")
          .update({ position: o.position, folder_id: o.folder_id })
          .eq("id", o.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.projects }),
  });
}

// =================== TASKS ===================
export function useTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? qk.tasks(projectId) : ["tasks", "noop"],
    enabled: !!projectId,
    queryFn: async (): Promise<Task[]> => {
      if (!projectId) return [];
      const { data, error } = await sb()
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .is("parent_task_id", null)
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSubtasks(parentId: string | undefined) {
  return useQuery({
    queryKey: parentId ? qk.subtasks(parentId) : ["subtasks", "noop"],
    enabled: !!parentId,
    queryFn: async (): Promise<Task[]> => {
      if (!parentId) return [];
      const { data, error } = await sb()
        .from("tasks")
        .select("*")
        .eq("parent_task_id", parentId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      title: string;
      parent_task_id?: string | null;
      status?: TaskStatus;
      position?: number;
      due_date?: string | null;
      time_of_day?: string | null;
    }) => {
      const { data: u } = await sb().auth.getUser();
      const { data, error } = await sb()
        .from("tasks")
        .insert({
          project_id: input.project_id,
          parent_task_id: input.parent_task_id ?? null,
          title: input.title,
          status: input.status ?? "a_faire",
          position: input.position ?? 0,
          due_date: input.due_date ?? null,
          time_of_day: input.time_of_day ?? null,
          created_by: u.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: qk.tasks(vars.project_id) });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
      if (vars.parent_task_id) {
        qc.invalidateQueries({ queryKey: qk.subtasks(vars.parent_task_id) });
      }
      qc.invalidateQueries({ queryKey: qk.workload });
    },
  });
}

export function useUpdateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<Task>) => {
      const { error } = await sb().from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: qk.tasks(projectId) });
      const prev = qc.getQueryData<Task[]>(qk.tasks(projectId));
      qc.setQueryData<Task[]>(qk.tasks(projectId), (old) =>
        old?.map((t) => (t.id === id ? ({ ...t, ...patch } as Task) : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.tasks(projectId), ctx.prev);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: qk.tasks(projectId) });
      qc.invalidateQueries({ queryKey: qk.workload });
      // Sync Google Agenda si une donnée calendrier a changé (best-effort).
      if ("due_date" in vars || "time_of_day" in vars || "title" in vars) {
        void syncTaskToGoogle(vars.id, "push");
      }
    },
  });
}

export function useUpdateSubtask(parentId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Task>) => {
      const { error } = await sb().from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: qk.subtasks(parentId) });
      const prev = qc.getQueryData<Task[]>(qk.subtasks(parentId));
      qc.setQueryData<Task[]>(qk.subtasks(parentId), (old) =>
        old?.map((t) => (t.id === id ? ({ ...t, ...patch } as Task) : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.subtasks(parentId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.subtasks(parentId) });
      qc.invalidateQueries({ queryKey: qk.tasks(projectId) });
      qc.invalidateQueries({ queryKey: qk.workload });
    },
  });
}

// =================== BULK TASK OPS ===================
export function useBulkUpdateTasks(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskIds,
      patch,
    }: {
      taskIds: string[];
      patch: { status?: TaskStatus; due_date?: string | null };
    }) => {
      if (taskIds.length === 0) return;
      const { error } = await sb()
        .from("tasks")
        .update(patch)
        .in("id", taskIds);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tasks(projectId) });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
      qc.invalidateQueries({ queryKey: qk.workload });
    },
  });
}

export function useBulkAssign(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskIds,
      userId,
      assign,
    }: {
      taskIds: string[];
      userId: string;
      assign: boolean;
    }) => {
      if (taskIds.length === 0) return;
      if (assign) {
        const rows = taskIds.map((tid) => ({ task_id: tid, user_id: userId }));
        const { error } = await sb()
          .from("task_assignees")
          .upsert(rows, { onConflict: "task_id,user_id" });
        if (error) throw error;
      } else {
        const { error } = await sb()
          .from("task_assignees")
          .delete()
          .eq("user_id", userId)
          .in("task_id", taskIds);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      vars.taskIds.forEach((tid) =>
        qc.invalidateQueries({ queryKey: qk.taskAssignees(tid) }),
      );
      qc.invalidateQueries({ queryKey: ["tasks-assignees-map"] });
      qc.invalidateQueries({ queryKey: qk.tasks(projectId) });
      qc.invalidateQueries({ queryKey: qk.workload });
    },
  });
}

export function useBulkDeleteTasks(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      if (taskIds.length === 0) return;
      const { error } = await sb().from("tasks").delete().in("id", taskIds);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tasks(projectId) });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
      qc.invalidateQueries({ queryKey: qk.workload });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; parent_task_id?: string | null }) => {
      const { error } = await sb().from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: qk.tasks(projectId) });
      if (vars.parent_task_id) {
        qc.invalidateQueries({ queryKey: qk.subtasks(vars.parent_task_id) });
      }
      qc.invalidateQueries({ queryKey: qk.workload });
    },
  });
}

// =================== REALTIME ===================
/**
 * Abonne le client aux changements Realtime des tâches d'un projet.
 * À chaque INSERT/UPDATE/DELETE sur `tasks` (filtré par `project_id`) ou sur
 * `task_assignees`, on invalide les query keys concernées : TanStack Query
 * refetch alors les vues actives (liste de tâches, sous-tâches dépliées,
 * assignés, batteries de charge). Aucun `setState` ici → conforme aux règles
 * de pureté React 19.
 */
export function useRealtimeTasks(projectId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!projectId) return;
    const client = sb();
    const channel = client
      .channel(`tasks-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: qk.tasks(projectId) });
          // On ne connaît pas toujours le parent (DELETE), on invalide large.
          qc.invalidateQueries({ queryKey: ["subtasks"] });
          qc.invalidateQueries({ queryKey: qk.workload });
        },
      )
      .on(
        // task_assignees n'a pas de project_id → pas de filtre possible.
        // Équipe interne restreinte : on écoute tout puis invalide large.
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignees" },
        () => {
          qc.invalidateQueries({ queryKey: ["task-assignees"] });
          qc.invalidateQueries({ queryKey: qk.workload });
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [projectId, qc]);
}

// =================== TASK ASSIGNEES ===================
export function useTasksAssigneesMap(taskIds: string[]) {
  const key = [...taskIds].sort().join(",");
  const { data } = useQuery({
    queryKey: ["tasks-assignees-map", key],
    enabled: taskIds.length > 0,
    queryFn: async (): Promise<Map<string, string[]>> => {
      const map = new Map<string, string[]>();
      if (taskIds.length === 0) return map;
      const { data, error } = await sb()
        .from("task_assignees")
        .select("task_id,user_id")
        .in("task_id", taskIds);
      if (error) throw error;
      for (const row of data ?? []) {
        const arr = map.get(row.task_id) ?? [];
        arr.push(row.user_id);
        map.set(row.task_id, arr);
      }
      return map;
    },
  });
  return data ?? new Map<string, string[]>();
}

export function useTaskAssignees(taskId: string | undefined) {
  return useQuery({
    queryKey: taskId ? qk.taskAssignees(taskId) : ["task-assignees", "noop"],
    enabled: !!taskId,
    queryFn: async (): Promise<string[]> => {
      if (!taskId) return [];
      const { data, error } = await sb()
        .from("task_assignees")
        .select("user_id")
        .eq("task_id", taskId);
      if (error) throw error;
      return (data ?? []).map((r) => r.user_id);
    },
  });
}

export function useToggleAssignee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      userId,
      assign,
    }: {
      taskId: string;
      userId: string;
      assign: boolean;
    }) => {
      if (assign) {
        const { error } = await sb()
          .from("task_assignees")
          .insert({ task_id: taskId, user_id: userId });
        if (error && error.code !== "23505") throw error; // ignore duplicate
      } else {
        const { error } = await sb()
          .from("task_assignees")
          .delete()
          .eq("task_id", taskId)
          .eq("user_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: qk.taskAssignees(vars.taskId) });
      qc.invalidateQueries({ queryKey: ["tasks-assignees-map"] });
      qc.invalidateQueries({ queryKey: qk.workload });
      // Notification push à la personne assignée (best-effort, ignore si la
      // fonction/les clés VAPID ne sont pas configurées).
      if (vars.assign) {
        void sb()
          .functions.invoke("send-push", {
            body: {
              userId: vars.userId,
              title: "Nouvelle tâche",
              body: "Une tâche vient de t'être assignée.",
              url: "/app",
            },
          })
          .catch(() => {});
      }
    },
  });
}

// =================== NOTIFICATION PREFS ===================
export type NotifPrefs = Database["public"]["Tables"]["notification_prefs"]["Row"];

export function useNotifPrefs() {
  const { data: user } = useMe();
  return useQuery({
    queryKey: ["notif-prefs", user?.id ?? null],
    enabled: !!user?.id,
    queryFn: async (): Promise<NotifPrefs | null> => {
      if (!user?.id) return null;
      const { data, error } = await sb()
        .from("notification_prefs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateNotifPrefs() {
  const qc = useQueryClient();
  const { data: user } = useMe();
  return useMutation({
    mutationFn: async (patch: Partial<NotifPrefs>) => {
      if (!user?.id) throw new Error("Non authentifié");
      const { error } = await sb()
        .from("notification_prefs")
        .upsert(
          {
            user_id: user.id,
            ...patch,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["notif-prefs"] }),
  });
}

// =================== TASK ATTACHMENTS ===================
export type TaskAttachment = Database["public"]["Tables"]["task_attachments"]["Row"];

export function useTasksAttachmentCounts(taskIds: string[]) {
  const key = [...taskIds].sort().join(",");
  const { data } = useQuery({
    queryKey: ["tasks-attachment-counts", key],
    enabled: taskIds.length > 0,
    queryFn: async (): Promise<Map<string, number>> => {
      const map = new Map<string, number>();
      if (taskIds.length === 0) return map;
      const { data, error } = await sb()
        .from("task_attachments")
        .select("task_id")
        .in("task_id", taskIds);
      if (error) throw error;
      for (const row of data ?? []) {
        map.set(row.task_id, (map.get(row.task_id) ?? 0) + 1);
      }
      return map;
    },
    staleTime: 30_000,
  });
  return data ?? new Map<string, number>();
}

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: taskId ? ["task-attachments", taskId] : ["task-attachments", "noop"],
    enabled: !!taskId,
    queryFn: async (): Promise<TaskAttachment[]> => {
      if (!taskId) return [];
      const { data, error } = await sb()
        .from("task_attachments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUploadAttachment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: u } = await sb().auth.getUser();
      const ext = file.name.split(".").pop() || "bin";
      const path = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await sb()
        .storage
        .from("attachments")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await sb()
        .from("task_attachments")
        .insert({
          task_id: taskId,
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: u.user?.id ?? null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-attachments", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks-attachment-counts"] });
    },
  });
}

/** Enregistre un fichier choisi via le Google Picker comme pièce jointe Drive. */
export function useAddDriveAttachment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: {
      id: string;
      name: string;
      url: string;
      mimeType: string | null;
      sizeBytes: number | null;
    }) => {
      const { data: u } = await sb().auth.getUser();
      const { error } = await sb()
        .from("task_attachments")
        .insert({
          task_id: taskId,
          source: "drive",
          drive_file_id: file.id,
          external_url: file.url,
          file_name: file.name,
          file_size: file.sizeBytes,
          mime_type: file.mimeType,
          uploaded_by: u.user?.id ?? null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-attachments", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks-attachment-counts"] });
    },
  });
}

export function useDeleteAttachment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachment: TaskAttachment) => {
      // Les pièces jointes Drive n'ont pas de fichier dans le Storage.
      if (attachment.source !== "drive" && attachment.storage_path) {
        await sb().storage.from("attachments").remove([attachment.storage_path]);
      }
      const { error } = await sb()
        .from("task_attachments")
        .delete()
        .eq("id", attachment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-attachments", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks-attachment-counts"] });
    },
  });
}

export function getAttachmentUrl(path: string) {
  return sb().storage.from("attachments").createSignedUrl(path, 60 * 60);
}

// =================== ALL TASKS (overview) ===================
export function useAllTasks() {
  const ws = useWorkspaceStore((s) => s.currentId);
  return useQuery({
    queryKey: ["all-tasks", ws],
    enabled: !!ws,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await sb()
        .from("tasks")
        .select("*")
        .eq("workspace_id", ws!)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

/**
 * Met à jour une tâche depuis la vue d'ensemble (qui lit `["all-tasks", ws]`).
 * Optimiste sur ce cache ; invalide aussi les listes par projet et la charge.
 */
export function useUpdateAllTask() {
  const qc = useQueryClient();
  const ws = useWorkspaceStore((s) => s.currentId);
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Task>) => {
      const { error } = await sb().from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      const key = ["all-tasks", ws] as const;
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Task[]>(key);
      qc.setQueryData<Task[]>(key, (old) =>
        old?.map((t) => (t.id === id ? ({ ...t, ...patch } as Task) : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["all-tasks", ws], ctx.prev);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ["all-tasks", ws] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: qk.workload });
      if ("due_date" in vars || "time_of_day" in vars || "title" in vars) {
        void syncTaskToGoogle(vars.id, "push");
      }
    },
  });
}

/**
 * Sync Realtime de la vue d'ensemble : toute modification de tâche (ou
 * d'assignation) rafraîchit la liste globale et la charge par personne. Permet
 * qu'une tâche passée « Fait » disparaisse aussitôt des listes « à faire ».
 */
export function useRealtimeAllTasks() {
  const qc = useQueryClient();
  const ws = useWorkspaceStore((s) => s.currentId);
  useEffect(() => {
    if (!ws) return;
    const client = sb();
    const channel = client
      .channel(`all-tasks-${ws}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          qc.invalidateQueries({ queryKey: ["all-tasks", ws] });
          qc.invalidateQueries({ queryKey: qk.workload });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignees" },
        () => {
          qc.invalidateQueries({ queryKey: ["tasks-assignees-map"] });
          qc.invalidateQueries({ queryKey: qk.workload });
        },
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [ws, qc]);
}
export function useWorkload() {
  return useQuery({
    queryKey: qk.workload,
    queryFn: async (): Promise<Workload[]> => {
      const { data, error } = await sb()
        .from("person_workload")
        .select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// =================== ROUTINES (all + per project) ===================
export function useAllRoutines() {
  const ws = useWorkspaceStore((s) => s.currentId);
  return useQuery({
    queryKey: ["all-routines", ws],
    enabled: !!ws,
    queryFn: async (): Promise<Routine[]> => {
      const { data, error } = await sb()
        .from("routines")
        .select("*")
        .eq("workspace_id", ws!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRoutines(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? qk.routines(projectId) : ["routines", "noop"],
    enabled: !!projectId,
    queryFn: async (): Promise<Routine[]> => {
      if (!projectId) return [];
      const { data, error } = await sb()
        .from("routines")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRoutineAssignees(routineId: string | undefined) {
  return useQuery({
    queryKey: routineId
      ? qk.routineAssignees(routineId)
      : ["routine-assignees", "noop"],
    enabled: !!routineId,
    queryFn: async (): Promise<string[]> => {
      if (!routineId) return [];
      const { data, error } = await sb()
        .from("routine_assignees")
        .select("user_id")
        .eq("routine_id", routineId);
      if (error) throw error;
      return (data ?? []).map((r) => r.user_id);
    },
  });
}

export interface RoutineFormInput {
  project_id: string;
  title: string;
  description: string | null;
  frequency: RoutineFrequency;
  days_of_week: number[] | null;
  day_of_month: number | null;
  time_of_day: string;
  active: boolean;
  assignee_ids: string[];
}

export function useUpsertRoutine() {
  const qc = useQueryClient();
  const ws = useWorkspaceStore((s) => s.currentId);
  return useMutation({
    mutationFn: async (input: RoutineFormInput & { id?: string }) => {
      const { assignee_ids, id, ...routineCols } = input;
      const { data: u } = await sb().auth.getUser();
      let routineId = id;
      if (id) {
        const { error } = await sb()
          .from("routines")
          .update(routineCols)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await sb()
          .from("routines")
          .insert({ ...routineCols, created_by: u.user?.id ?? null, workspace_id: ws })
          .select()
          .single();
        if (error) throw error;
        routineId = data.id;
      }
      if (!routineId) throw new Error("Routine ID manquant");

      // Reset assignees → bulk replace
      const { error: delErr } = await sb()
        .from("routine_assignees")
        .delete()
        .eq("routine_id", routineId);
      if (delErr) throw delErr;
      if (assignee_ids.length > 0) {
        const { error: insErr } = await sb()
          .from("routine_assignees")
          .insert(
            assignee_ids.map((user_id) => ({ routine_id: routineId!, user_id })),
          );
        if (insErr) throw insErr;
      }
      return routineId;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: qk.routines(vars.project_id) });
    },
  });
}

export function useToggleRoutineActive(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await sb().from("routines").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.routines(projectId) }),
  });
}

export function useDeleteRoutine(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("routines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.routines(projectId) }),
  });
}

// Helper: log out
export function useSignOut() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const { error } = await sb().auth.signOut();
      if (error) throw error;
    },
  } as UseMutationOptions<void, Error, void>);
}

// =================== REALTIME : PROFILS (photo / nom / couleur live) ===================
/**
 * Abonne le client aux changements de `profiles` : dès qu'un utilisateur change
 * sa photo / son nom / sa couleur, on invalide les caches concernés pour que la
 * mise à jour apparaisse en direct partout (sidebar, vue d'ensemble, assignés).
 */
export function useRealtimeProfiles() {
  const qc = useQueryClient();
  useEffect(() => {
    const client = sb();
    const channel = client
      .channel("profiles-all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          qc.invalidateQueries({ queryKey: qk.profiles });
          qc.invalidateQueries({ queryKey: ["my-profile"] });
          qc.invalidateQueries({ queryKey: qk.workload });
        },
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [qc]);
}

// =================== GOOGLE INTEGRATION (client) ===================
export interface GoogleCalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  color: string | null;
  start: string;
  end: string | null;
  allDay: boolean;
  htmlLink: string | null;
}

export interface GoogleCalendarRow {
  id: string;
  google_calendar_id: string;
  summary: string | null;
  bg_color: string | null;
  selected: boolean;
}

/** Événements Google des agendas sélectionnés, sur une plage (vue calendrier). */
export function useGoogleEvents(timeMin: string | null, timeMax: string | null) {
  return useQuery({
    queryKey: ["google-events", timeMin, timeMax],
    enabled: !!timeMin && !!timeMax,
    staleTime: 60_000,
    queryFn: async (): Promise<{ connected: boolean; events: GoogleCalendarEvent[] }> => {
      const res = await fetch(
        `/api/google/events?timeMin=${encodeURIComponent(timeMin!)}&timeMax=${encodeURIComponent(timeMax!)}`,
      );
      if (!res.ok) return { connected: false, events: [] };
      return res.json();
    },
  });
}

/** Liste des agendas Google connectés (+ statut de connexion). */
export function useGoogleCalendars() {
  return useQuery({
    queryKey: ["google-calendars"],
    queryFn: async (): Promise<{
      connected: boolean;
      email: string | null;
      writeCalendarId: string | null;
      calendars: GoogleCalendarRow[];
    }> => {
      const res = await fetch("/api/google/calendars");
      if (!res.ok) throw new Error("Chargement des agendas échoué");
      return res.json();
    },
  });
}

export function useUpdateGoogleCalendars() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      selected?: Record<string, boolean>;
      writeCalendarId?: string | null;
    }) => {
      const res = await fetch("/api/google/calendars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Mise à jour échouée");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google-calendars"] });
      qc.invalidateQueries({ queryKey: ["google-events"] });
    },
  });
}

/**
 * Pousse/maj/supprime l'événement Google d'une tâche (best-effort : ne lève pas
 * si l'utilisateur n'a pas connecté Google).
 */
export async function syncTaskToGoogle(
  taskId: string,
  action: "push" | "pull" | "delete" = "push",
): Promise<void> {
  try {
    await fetch("/api/google/tasks/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, action }),
    });
  } catch {
    // best-effort
  }
}

// =================== ESPACES DE TRAVAIL ===================
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async (): Promise<Workspace[]> => {
      const { data, error } = await sb()
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<Workspace> => {
      const { data: u } = await sb().auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Non authentifié");
      const { data: wsRow, error } = await sb()
        .from("workspaces")
        .insert({ name: name.trim(), created_by: uid })
        .select()
        .single();
      if (error) throw error;
      const { error: memErr } = await sb()
        .from("workspace_members")
        .insert({ workspace_id: wsRow.id, user_id: uid, role: "admin" });
      if (memErr) throw memErr;
      return wsRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export interface WorkspaceMemberRow {
  user_id: string;
  role: "admin" | "member";
  full_name: string | null;
  avatar_url: string | null;
  color: string;
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<WorkspaceMemberRow[]> => {
      if (!workspaceId) return [];
      const { data, error } = await sb()
        .from("workspace_members")
        .select("user_id, role")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const ids = rows.map((r) => r.user_id);
      const { data: profs } = await sb()
        .from("profiles")
        .select("id, full_name, avatar_url, color")
        .in("id", ids);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      return rows.map((r) => {
        const p = byId.get(r.user_id);
        return {
          user_id: r.user_id,
          role: r.role,
          full_name: p?.full_name ?? null,
          avatar_url: p?.avatar_url ?? null,
          color: p?.color ?? "#94a3b8",
        };
      });
    },
  });
}

/** Crée un lien d'invitation et renvoie le token. */
export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workspaceId,
      role,
    }: {
      workspaceId: string;
      role: "admin" | "member";
    }): Promise<string> => {
      const { data: u } = await sb().auth.getUser();
      const { data, error } = await sb()
        .from("workspace_invites")
        .insert({
          workspace_id: workspaceId,
          role,
          created_by: u.user?.id ?? null,
        })
        .select("token")
        .single();
      if (error) throw error;
      return data.token;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["workspace-invites", vars.workspaceId] }),
  });
}

// =================== AGENDAS DE L'ÉQUIPE (lecture seule) ===================
export interface TeamEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  personName: string;
  personColor: string;
}

/** Événements des agendas des autres membres de l'espace courant (dispos). */
export function useTeamEvents(
  timeMin: string | null,
  timeMax: string | null,
  enabled: boolean,
) {
  const ws = useWorkspaceStore((s) => s.currentId);
  return useQuery({
    queryKey: ["team-events", ws, timeMin, timeMax],
    enabled: enabled && !!ws && !!timeMin && !!timeMax,
    staleTime: 60_000,
    queryFn: async (): Promise<TeamEvent[]> => {
      const res = await fetch(
        `/api/google/team-events?workspaceId=${ws}&timeMin=${encodeURIComponent(timeMin!)}&timeMax=${encodeURIComponent(timeMax!)}`,
      );
      if (!res.ok) return [];
      const json = await res.json();
      return json.events ?? [];
    },
  });
}
