"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamBattery } from "@/components/overview/team-battery";
import { UpcomingTasks } from "@/components/overview/upcoming-tasks";
import { RoutinesTracker } from "@/components/overview/routines-tracker";
import { ChildrenOverview } from "@/components/overview/children-overview";
import { WorkloadCard } from "@/components/overview/workload-card";
import {
  useAllRoutines,
  useAllTasks,
  useMe,
  useProfiles,
  useProjects,
  useResponsibilities,
  useTasksAssigneesMap,
  useWorkload,
} from "@/lib/queries";
import type { UserRole } from "@/lib/supabase/database.types";

export default function OverviewPage() {
  const { data: workload = [], isLoading: loadingWl } = useWorkload();
  const { data: tasks = [], isLoading: loadingTasks } = useAllTasks();
  const { data: projects = [] } = useProjects();
  const { data: profiles = [] } = useProfiles();
  const { data: routines = [] } = useAllRoutines();
  const { data: me } = useMe();
  const { data: responsibilities = [] } = useResponsibilities();

  const myChildren = useMemo(() => {
    if (!me) return [];
    const ids = new Set(
      responsibilities
        .filter((r) => r.parent_id === me.id)
        .map((r) => r.child_id),
    );
    return profiles.filter((p) => ids.has(p.id));
  }, [me, responsibilities, profiles]);

  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);

  const profilesById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles],
  );

  const assigneesMap = useTasksAssigneesMap(tasks.map((t) => t.id));

  // Filtre les profils par rôle (sélecteur)
  const visibleProfiles = useMemo(() => {
    return profiles.filter((p) => roleFilter === "all" || p.role === roleFilter);
  }, [profiles, roleFilter]);

  // Restreint les tâches aux assignés visibles (par rôle), et au filtre par personne si actif
  const filteredTasks = useMemo(() => {
    const allowedUserIds = new Set(visibleProfiles.map((p) => p.id));
    return tasks.filter((t) => {
      const aIds = assigneesMap.get(t.id) ?? [];
      if (assigneeFilter && !aIds.includes(assigneeFilter)) return false;
      if (aIds.length === 0) return roleFilter === "all" && !assigneeFilter;
      return aIds.some((uid) => allowedUserIds.has(uid));
    });
  }, [tasks, assigneesMap, visibleProfiles, roleFilter, assigneeFilter]);

  const visibleWorkload = workload.filter((w) =>
    visibleProfiles.some((p) => p.id === w.user_id),
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Vue d&apos;ensemble
          </h1>
          <p className="text-sm text-muted-foreground">
            Suivi global, à venir aujourd&apos;hui et cette semaine, charge par personne.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
            <RoleChip
              active={roleFilter === "all"}
              onClick={() => setRoleFilter("all")}
            >
              Tous
            </RoleChip>
            <RoleChip
              active={roleFilter === "admin"}
              onClick={() => setRoleFilter("admin")}
            >
              Admins
            </RoleChip>
            <RoleChip
              active={roleFilter === "member"}
              onClick={() => setRoleFilter("member")}
            >
              Membres
            </RoleChip>
          </div>
          {assigneeFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssigneeFilter(null)}
              className="h-9"
            >
              <Filter className="size-3.5" />
              {profilesById.get(assigneeFilter)?.full_name ?? "?"} ×
            </Button>
          )}
        </div>
      </header>

      <TeamBattery workload={visibleWorkload} />

      <ChildrenOverview people={myChildren} workload={workload} />

      <UpcomingTasks
        tasks={filteredTasks}
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color ?? "#94a3b8",
        }))}
        profiles={profiles}
        assigneesMap={assigneesMap}
      />

      <RoutinesTracker
        routines={routines}
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color ?? "#94a3b8",
        }))}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Charge par personne
        </h2>
        {loadingWl || loadingTasks ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : visibleWorkload.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
            Aucun profil à afficher.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleWorkload.map((row) => (
              <button
                type="button"
                key={row.user_id}
                onClick={() =>
                  setAssigneeFilter((cur) =>
                    cur === row.user_id ? null : row.user_id,
                  )
                }
                className={[
                  "rounded-xl text-left transition-all",
                  assigneeFilter === row.user_id
                    ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-background"
                    : "hover:-translate-y-0.5 hover:shadow-md",
                ].join(" ")}
              >
                <WorkloadCard
                  row={row}
                  avatarUrl={profilesById.get(row.user_id)?.avatar_url}
                />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RoleChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-muted-foreground hover:bg-muted",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

