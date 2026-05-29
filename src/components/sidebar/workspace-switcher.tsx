"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Plus, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  useWorkspaces,
  useCreateWorkspace,
  useCreateInvite,
} from "@/lib/queries";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function WorkspaceSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const currentId = useWorkspaceStore((s) => s.currentId);
  const setCurrent = useWorkspaceStore((s) => s.setCurrent);
  const createWorkspace = useCreateWorkspace();
  const createInvite = useCreateInvite();
  const [inviting, setInviting] = useState(false);

  // Espace courant par défaut : premier espace si aucun (ou invalide) sélectionné.
  useEffect(() => {
    if (workspaces.length === 0) return;
    if (!currentId || !workspaces.some((w) => w.id === currentId)) {
      setCurrent(workspaces[0].id);
    }
  }, [workspaces, currentId, setCurrent]);

  const current = workspaces.find((w) => w.id === currentId) ?? workspaces[0];

  async function handleCreate() {
    const name = window.prompt("Nom du nouvel espace de travail ?");
    if (!name?.trim()) return;
    try {
      const ws = await createWorkspace.mutateAsync(name.trim());
      setCurrent(ws.id);
      toast.success(`Espace « ${ws.name} » créé`);
      onNavigate?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function handleInvite() {
    if (!current) return;
    setInviting(true);
    try {
      const token = await createInvite.mutateAsync({
        workspaceId: current.id,
        role: "member",
      });
      const url = `${window.location.origin}/join/${token}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Lien d'invitation copié dans le presse-papiers !");
      } catch {
        toast.message("Lien d'invitation", { description: url });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setInviting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-2 mt-3 h-10 animate-pulse rounded-xl bg-muted/60" />
    );
  }

  return (
    <div className="px-2 pt-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-xl border border-sidebar-border bg-background px-3 py-2 text-left transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              aria-label="Changer d'espace de travail"
            />
          }
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
            {(current?.name ?? "?").charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {current?.name ?? "Espace"}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          {workspaces.map((w) => (
            <DropdownMenuItem
              key={w.id}
              onClick={() => {
                setCurrent(w.id);
                onNavigate?.();
              }}
            >
              <span className="grid size-5 shrink-0 place-items-center rounded bg-primary text-[10px] font-semibold text-primary-foreground">
                {w.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === current?.id && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCreate}>
            <Plus className="size-3.5" />
            Créer un espace
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleInvite} disabled={inviting}>
            {inviting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserPlus className="size-3.5" />
            )}
            Inviter (copier le lien)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
