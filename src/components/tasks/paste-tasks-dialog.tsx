"use client";

import { useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { qk, type Profile } from "@/lib/queries";
import type { Database } from "@/lib/supabase/database.types";

type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];

interface ParsedLine {
  raw: string;
  title: string;
  assigneeName: string | null;
  dueDate: string | null;
  matchedAssigneeId: string | null;
  matchError: string | null;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseLine(raw: string, profiles: Profile[]): ParsedLine {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      raw,
      title: "",
      assigneeName: null,
      dueDate: null,
      matchedAssigneeId: null,
      matchError: null,
    };
  }
  const parts = trimmed.split("|").map((p) => p.trim());
  const title = parts[0] ?? trimmed;

  let assigneeName: string | null = null;
  let matchedAssigneeId: string | null = null;
  let matchError: string | null = null;
  let dueDate: string | null = null;

  for (const part of parts.slice(1)) {
    if (part.startsWith("@")) {
      assigneeName = part.slice(1);
      const match = profiles.find(
        (p) =>
          (p.full_name ?? "").toLowerCase() === assigneeName!.toLowerCase(),
      );
      if (match) matchedAssigneeId = match.id;
      else matchError = `@${assigneeName} introuvable`;
    } else if (ISO_DATE_RE.test(part)) {
      dueDate = new Date(part).toISOString();
    }
  }
  return {
    raw,
    title,
    assigneeName,
    dueDate,
    matchedAssigneeId,
    matchError,
  };
}

export function PasteTasksDialog({
  projectId,
  profiles,
  basePosition,
}: {
  projectId: string;
  profiles: Profile[];
  basePosition: number;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const parsed = lines.map((l) => parseLine(l, profiles));

  async function handleSubmit() {
    if (parsed.length === 0) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: u } = await supabase.auth.getUser();

      const rows: TaskInsert[] = parsed.map((p, idx) => ({
        project_id: projectId,
        title: p.title,
        status: "a_faire",
        due_date: p.dueDate,
        position: basePosition + idx,
        created_by: u.user?.id ?? null,
      }));
      const inserted = await supabase.from("tasks").insert(rows).select();

      if (inserted.error) throw inserted.error;
      const insertedTasks = inserted.data ?? [];

      // Assignations en bulk pour les tâches qui ont un match
      const assigneeRows = insertedTasks
        .map((t, i) => ({ task: t, parsed: parsed[i] }))
        .filter(({ parsed }) => parsed.matchedAssigneeId)
        .map(({ task, parsed }) => ({
          task_id: task.id,
          user_id: parsed.matchedAssigneeId!,
        }));

      if (assigneeRows.length > 0) {
        const { error: err } = await supabase
          .from("task_assignees")
          .insert(assigneeRows);
        if (err) throw err;
      }

      qc.invalidateQueries({ queryKey: qk.tasks(projectId) });
      qc.invalidateQueries({ queryKey: qk.workload });
      toast.success(`${insertedTasks.length} tâche(s) créée(s)`);
      setText("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'import");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <ClipboardPaste className="size-3.5" />
            Coller des tâches
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Coller des tâches</DialogTitle>
          <DialogDescription>
            Une tâche par ligne. Format optionnel :{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              Titre | @prénom | AAAA-MM-JJ
            </code>
          </DialogDescription>
        </DialogHeader>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={`Préparer la maquette\nRelire le brief | @rémi | 2026-06-05\nEnvoyer la facture | @marie`}
          className="w-full rounded-lg border border-input bg-background p-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        {parsed.length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/30 p-2">
            <div className="mb-1 text-xs font-semibold text-muted-foreground">
              Aperçu ({parsed.length} tâche{parsed.length > 1 ? "s" : ""})
            </div>
            <ul className="flex flex-col gap-1 text-xs">
              {parsed.map((p, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.title}</span>
                  {p.assigneeName && (
                    <span
                      className={
                        p.matchError
                          ? "rounded bg-destructive/10 px-1.5 py-0.5 text-destructive"
                          : "rounded bg-primary/10 px-1.5 py-0.5 text-primary"
                      }
                    >
                      @{p.assigneeName}
                      {p.matchError ? " ?" : ""}
                    </span>
                  )}
                  {p.dueDate && (
                    <span className="rounded bg-muted px-1.5 py-0.5">
                      {p.dueDate.slice(0, 10)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Annuler
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={submitting || parsed.length === 0}
          >
            {submitting
              ? "…"
              : `Créer ${parsed.length} tâche${parsed.length > 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
