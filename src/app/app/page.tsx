import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { computeBatteries, type TaskForBattery } from "@/lib/battery";
import { BatteryGauge } from "@/components/battery-gauge";
import { SignOutButton } from "@/components/sign-out-button";
import { AddMemberDialog } from "@/components/add-member-dialog";
import { AddFolderDialog } from "@/components/add-folder-dialog";
import { AddProjectDialog } from "@/components/add-project-dialog";
import { AddTaskDialog } from "@/components/add-task-dialog";
import { TaskItem } from "@/components/task-item";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/onboarding");

  const supabase = await createClient();

  const [{ data: household }, { data: members }, { data: folders }, { data: projects }, { data: tasks }] =
    await Promise.all([
      supabase.from("households").select("*").eq("id", profile.household_id).single(),
      supabase
        .from("profiles")
        .select("id, display_name, color, role, child_mode")
        .order("created_at"),
      supabase.from("folders").select("*").order("position").order("created_at"),
      supabase.from("projects").select("*").order("created_at"),
      supabase
        .from("tasks")
        .select(
          "id, title, status, battery_cost, priority, project_id, task_assignees(profile_id)",
        )
        .order("created_at"),
    ]);

  const memberList = members ?? [];
  const memberMap = new Map(memberList.map((m) => [m.id, m]));
  const batteries = computeBatteries(
    memberList.map((m) => m.id),
    (tasks ?? []) as unknown as TaskForBattery[],
  );

  const projectsByFolder = new Map<string, typeof projects>();
  for (const p of projects ?? []) {
    const arr = projectsByFolder.get(p.folder_id) ?? [];
    arr.push(p);
    projectsByFolder.set(p.folder_id, arr);
  }

  const tasksByProject = new Map<string, NonNullable<typeof tasks>>();
  for (const t of tasks ?? []) {
    const arr = tasksByProject.get(t.project_id) ?? [];
    arr.push(t);
    tasksByProject.set(t.project_id, arr);
  }

  const assigneesOf = (taskAssignees: { profile_id: string }[]) =>
    taskAssignees
      .map((ta) => memberMap.get(ta.profile_id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .map((m) => ({ id: m.id, color: m.color, display_name: m.display_name }));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-5 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold">
            {household?.name ?? "Mon foyer"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Connecté·e en tant que {profile.display_name}
          </p>
        </div>
        <SignOutButton />
      </header>

      {/* Batteries du foyer */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="font-heading text-2xl">
              🔋 Batteries du foyer
            </CardTitle>
            <CardDescription>
              Charge mentale prédite — vert &lt; 60 %, orange 60-85 %, rouge &gt;
              85 %.
            </CardDescription>
          </div>
          <AddMemberDialog householdId={profile.household_id} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {memberList.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <span
                className="size-8 shrink-0 rounded-full"
                style={{ backgroundColor: m.color }}
                aria-hidden
              />
              <BatteryGauge
                label={m.display_name}
                value={batteries[m.id] ?? 0}
                className="flex-1"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dossiers / projets / tâches */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl font-semibold">Dossiers</h2>
          <AddFolderDialog householdId={profile.household_id} />
        </div>

        {(folders ?? []).length === 0 && (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucun dossier pour l&apos;instant. Crée ton premier dossier (ex.
            « Maison », « École »).
          </p>
        )}

        {(folders ?? []).map((folder) => (
          <Card key={folder.id}>
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="flex items-center gap-2 text-xl">
                <span>{folder.icon ?? "📁"}</span>
                {folder.name}
              </CardTitle>
              <AddProjectDialog folderId={folder.id} />
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {(projectsByFolder.get(folder.id) ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun projet dans ce dossier.
                </p>
              )}
              {(projectsByFolder.get(folder.id) ?? []).map((project) => (
                <div key={project.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{project.name}</h3>
                    <AddTaskDialog
                      projectId={project.id}
                      members={memberList.map((m) => ({
                        id: m.id,
                        display_name: m.display_name,
                        color: m.color,
                      }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {(tasksByProject.get(project.id) ?? []).map((t) => (
                      <TaskItem
                        key={t.id}
                        id={t.id}
                        title={t.title}
                        status={t.status}
                        batteryCost={t.battery_cost}
                        priority={t.priority}
                        assignees={assigneesOf(t.task_assignees)}
                      />
                    ))}
                    {(tasksByProject.get(project.id) ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Pas encore de tâche.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
