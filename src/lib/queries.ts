"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
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
        .single();
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
  return useQuery({
    queryKey: qk.folders,
    queryFn: async (): Promise<Folder[]> => {
      const { data, error } = await sb()
        .from("folders")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, position }: { name: string; position: number }) => {
      const { data, error } = await sb()
        .from("folders")
        .insert({ name, position })
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
  return useQuery({
    queryKey: qk.projects,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await sb()
        .from("projects")
        .select("*")
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
  return useMutation({
    mutationFn: async (input: {
      name: string;
      folder_id: string | null;
      position: number;
      is_routine?: boolean;
    }) => {
      const { data, error } = await sb()
        .from("projects")
        .insert(input)
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
          created_by: u.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: qk.tasks(vars.project_id) });
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
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.tasks(projectId) });
      qc.invalidateQueries({ queryKey: qk.workload });
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
      qc.invalidateQueries({ queryKey: qk.workload });
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

export function useDeleteAttachment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachment: TaskAttachment) => {
      await sb().storage.from("attachments").remove([attachment.storage_path]);
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
  return useQuery({
    queryKey: ["all-tasks"],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await sb()
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

// =================== WORKLOAD ===================
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
  return useQuery({
    queryKey: ["all-routines"],
    queryFn: async (): Promise<Routine[]> => {
      const { data, error } = await sb()
        .from("routines")
        .select("*")
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
          .insert({ ...routineCols, created_by: u.user?.id ?? null })
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
