"use client";

import { useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  useCreateTask,
  useToggleAssignee,
  syncTaskToGoogle,
  type Profile,
} from "@/lib/queries";

type ProjectOption = { id: string; name: string; color: string };

/**
 * Création rapide d'une tâche depuis la vue d'ensemble : titre, projet,
 * personnes assignées, date et heure. Assigne les personnes après création
 * (déclenche aussi la notification push côté hook).
 */
export function AddTaskDialog({
  projects,
  profiles,
  onClose,
}: {
  projects: ProjectOption[];
  profiles: Profile[];
  onClose: () => void;
}) {
  const createTask = useCreateTask();
  const toggleAssignee = useToggleAssignee();

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  });
  const [time, setTime] = useState("");
  const [assignees, setAssignees] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setAssignees((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!title.trim()) {
      toast.error("Donne un titre à la tâche");
      return;
    }
    if (!projectId) {
      toast.error("Choisis un projet");
      return;
    }
    setBusy(true);
    try {
      const due = date ? new Date(`${date}T12:00:00`).toISOString() : null;
      const created = await createTask.mutateAsync({
        project_id: projectId,
        title: title.trim(),
        position: 0,
        due_date: due,
        time_of_day: time ? `${time}:00` : null,
      });
      if (created?.id) {
        await Promise.all(
          [...assignees].map((userId) =>
            toggleAssignee.mutateAsync({
              taskId: created.id,
              userId,
              assign: true,
            }),
          ),
        );
        // Crée l'événement dans Google Agenda (best-effort).
        if (due) void syncTaskToGoogle(created.id, "push");
      }
      toast.success("Tâche créée");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col gap-5 overflow-hidden rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Plus className="size-4" />
            </span>
            Nouvelle tâche
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Titre</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Ex. Préparer la réunion"
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-xs font-medium text-muted-foreground">Projet</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              {projects.length === 0 && <option value="">Aucun projet</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Heure</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            Assigner à
          </label>
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => {
              const init = (p.full_name ?? "?").trim().charAt(0).toUpperCase();
              const on = assignees.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={[
                    "inline-flex h-9 items-center gap-2 rounded-full border pl-1 pr-3 text-xs font-medium transition-colors",
                    on
                      ? "border-transparent bg-primary text-white shadow-sm"
                      : "bg-card text-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  <Avatar className="size-7" style={{ backgroundColor: p.color }}>
                    {p.avatar_url && (
                      <AvatarImage src={p.avatar_url} alt={p.full_name ?? ""} />
                    )}
                    <AvatarFallback
                      className="text-[10px] font-semibold text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      {init}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[120px] truncate">{p.full_name}</span>
                  {on && <Check className="size-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Créer la tâche
          </Button>
        </div>
      </div>
    </div>
  );
}
