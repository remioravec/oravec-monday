"use client";

import { Calendar, Check, Trash2, UserPlus, X } from "lucide-react";
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
import {
  useBulkAssign,
  useBulkDeleteTasks,
  useBulkUpdateTasks,
  type Profile,
} from "@/lib/queries";
import { statusColor, statusLabel } from "@/components/tasks/status-pill";
import type { TaskStatus } from "@/lib/supabase/database.types";

const STATUSES: TaskStatus[] = ["a_faire", "en_cours", "fait"];

export function BulkActionBar({
  projectId,
  selectedIds,
  onClear,
  profiles,
}: {
  projectId: string;
  selectedIds: string[];
  onClear: () => void;
  profiles: Profile[];
}) {
  const update = useBulkUpdateTasks(projectId);
  const bulkAssign = useBulkAssign(projectId);
  const bulkDelete = useBulkDeleteTasks(projectId);

  if (selectedIds.length === 0) return null;

  async function setStatus(s: TaskStatus) {
    try {
      await update.mutateAsync({ taskIds: selectedIds, patch: { status: s } });
      toast.success(`Statut mis à jour (${selectedIds.length})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function setDate(iso: string | null) {
    try {
      await update.mutateAsync({
        taskIds: selectedIds,
        patch: { due_date: iso },
      });
      toast.success(`Échéance mise à jour (${selectedIds.length})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function toggleAssignee(userId: string, assign: boolean) {
    try {
      await bulkAssign.mutateAsync({ taskIds: selectedIds, userId, assign });
      toast.success(assign ? "Assigné(s)" : "Désassigné(s)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Supprimer ${selectedIds.length} tâche${selectedIds.length > 1 ? "s" : ""} ?`,
      )
    )
      return;
    try {
      await bulkDelete.mutateAsync(selectedIds);
      toast.success(`Supprimé(s) : ${selectedIds.length}`);
      onClear();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 sm:px-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900 px-2 py-2 text-white shadow-xl sm:gap-2 sm:px-3">
        <div className="flex shrink-0 items-center gap-1.5 pr-1.5">
          <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold tabular-nums">
            {selectedIds.length}
          </span>
          <span className="hidden text-sm sm:inline">sélectionnée{selectedIds.length > 1 ? "s" : ""}</span>
        </div>

        <span className="h-6 w-px shrink-0 bg-slate-700" />

        {/* Status */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1.5 px-2 text-white hover:bg-slate-800"
              />
            }
          >
            <Check className="size-3.5" />
            Statut
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {STATUSES.map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatus(s)} className="gap-2">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: statusColor(s) }}
                />
                {statusLabel(s)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1.5 px-2 text-white hover:bg-slate-800"
              />
            }
          >
            <Calendar className="size-3.5" />
            Date
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-2">
            <div className="flex flex-col gap-2">
              <input
                type="date"
                onChange={(e) => {
                  if (!e.target.value) return;
                  setDate(new Date(e.target.value).toISOString());
                }}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDate(null)}
                className="justify-start"
              >
                Effacer la date
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assignees */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1.5 px-2 text-white hover:bg-slate-800"
              />
            }
          >
            <UserPlus className="size-3.5" />
            Assigner
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56">
            <DropdownMenuLabel>Ajouter à la sélection</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profiles.length === 0 && (
              <DropdownMenuItem disabled>Aucun profil</DropdownMenuItem>
            )}
            {profiles.map((p) => {
              const initial = (p.full_name ?? "?").trim().charAt(0).toUpperCase();
              return (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => toggleAssignee(p.id, true)}
                  className="gap-2"
                >
                  <Avatar className="size-5" style={{ backgroundColor: p.color }}>
                    {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.full_name ?? ""} />}
                    <AvatarFallback
                      className="text-[10px] text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  {p.full_name}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Retirer</DropdownMenuLabel>
            {profiles.map((p) => (
              <DropdownMenuItem
                key={`rm-${p.id}`}
                onClick={() => toggleAssignee(p.id, false)}
                className="text-muted-foreground"
              >
                Retirer {p.full_name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="h-8 shrink-0 gap-1.5 px-2 text-red-300 hover:bg-red-500/20 hover:text-red-200"
        >
          <Trash2 className="size-3.5" />
          Supprimer
        </Button>

        <span className="h-6 w-px bg-slate-700" />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          className="text-white hover:bg-slate-800"
          aria-label="Annuler la sélection"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
