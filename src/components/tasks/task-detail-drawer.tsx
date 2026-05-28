"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusPill } from "@/components/tasks/status-pill";
import {
  getAttachmentUrl,
  useDeleteAttachment,
  useTaskAttachments,
  useUpdateTask,
  useUploadAttachment,
  type Task,
  type TaskAttachment,
} from "@/lib/queries";
import type { TaskStatus } from "@/lib/supabase/database.types";

export function TaskDetailDrawer({
  task,
  projectId,
  open,
  onOpenChange,
}: {
  task: Task;
  projectId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  if (!open) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!w-[100vw] !max-w-[560px] flex flex-col gap-0 overflow-hidden p-0"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="line-clamp-2">{task.title}</SheetTitle>
          <SheetDescription className="sr-only">
            Détails de la tâche, description et pièces jointes
          </SheetDescription>
        </SheetHeader>
        <DrawerBody task={task} projectId={projectId} />
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({ task, projectId }: { task: Task; projectId: string }) {
  const update = useUpdateTask(projectId);
  const { data: attachments = [] } = useTaskAttachments(task.id);
  const upload = useUploadAttachment(task.id);
  const remove = useDeleteAttachment(task.id);

  const [description, setDescription] = useState(task.description ?? "");
  const [savingDesc, setSavingDesc] = useState(false);

  async function saveDescription() {
    setSavingDesc(true);
    try {
      await update.mutateAsync({
        id: task.id,
        description: description.trim() || null,
      });
      toast.success("Description enregistrée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavingDesc(false);
    }
  }

  async function handleFile(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Fichier trop lourd (max 15 Mo)");
      return;
    }
    try {
      await upload.mutateAsync(file);
      toast.success(`Ajouté : ${file.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload échoué");
    }
  }

  async function handleDownload(a: TaskAttachment) {
    // Pièce jointe Drive : on ouvre directement le lien Google Drive.
    if (a.source === "drive") {
      if (a.external_url) window.open(a.external_url, "_blank");
      else toast.error("Lien Drive introuvable");
      return;
    }
    if (!a.storage_path) {
      toast.error("Lien introuvable");
      return;
    }
    const { data, error } = await getAttachmentUrl(a.storage_path);
    if (error || !data) {
      toast.error("Lien introuvable");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function handleDelete(a: TaskAttachment) {
    if (!window.confirm(`Supprimer "${a.file_name}" ?`)) return;
    try {
      await remove.mutateAsync(a);
      toast.success("Supprimé");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <StatusPill
          status={task.status as TaskStatus}
          onChange={(s) => update.mutate({ id: task.id, status: s })}
        />
        <div className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1">
          <span className="text-xs text-muted-foreground">Date</span>
          <input
            type="date"
            value={task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : ""}
            onChange={(e) =>
              update.mutate({
                id: task.id,
                due_date: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
            className="h-6 bg-transparent text-xs outline-none"
          />
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1">
          <span className="text-xs text-muted-foreground">Heure</span>
          <input
            type="time"
            value={task.time_of_day ? task.time_of_day.slice(0, 5) : ""}
            onChange={(e) =>
              update.mutate({
                id: task.id,
                time_of_day: e.target.value ? e.target.value + ":00" : null,
              })
            }
            className="h-6 w-20 bg-transparent text-xs outline-none"
          />
        </div>
      </div>

      {/* Description */}
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Description</h3>
          {description !== (task.description ?? "") && (
            <Button
              size="sm"
              onClick={saveDescription}
              disabled={savingDesc}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {savingDesc ? "Enregistrement…" : "Enregistrer"}
            </Button>
          )}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder="Ajoute une description, des liens, du contexte…"
          className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
        />
      </section>

      {/* Attachments */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Paperclip className="size-4 text-muted-foreground" />
            Pièces jointes
            <span className="text-xs text-muted-foreground">({attachments.length})</span>
          </h3>
          <label className="cursor-pointer">
            <input
              type="file"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium hover:bg-muted">
              {upload.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Paperclip className="size-3.5" />
              )}
              Ajouter
            </span>
          </label>
        </div>
        {attachments.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-xs italic text-muted-foreground">
            Aucune pièce jointe.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.file_name}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {a.file_size ? `${Math.round(a.file_size / 1024)} Ko` : "—"}
                  </div>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => handleDownload(a)}
                  aria-label="Télécharger"
                >
                  <Download className="size-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => handleDelete(a)}
                  aria-label="Supprimer"
                  className="text-destructive"
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
