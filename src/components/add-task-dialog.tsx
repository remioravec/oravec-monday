"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  display_name: string;
  color: string;
}

const PRIORITIES = [
  { value: "low", label: "Basse" },
  { value: "normal", label: "Normale" },
  { value: "high", label: "Haute" },
] as const;

export function AddTaskDialog({
  projectId,
  members,
}: {
  projectId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [batteryCost, setBatteryCost] = useState(10);
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleAssignee(id: string) {
    setAssignees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (assignees.length === 0) {
      toast.error("Assigne au moins un membre.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title: title.trim(),
        battery_cost: batteryCost,
        priority,
      })
      .select("id")
      .single();

    if (error || !task) {
      setLoading(false);
      toast.error(error?.message ?? "Erreur");
      return;
    }

    const { error: aErr } = await supabase
      .from("task_assignees")
      .insert(assignees.map((profile_id) => ({ task_id: task.id, profile_id })));
    setLoading(false);

    if (aErr) {
      toast.error(aErr.message);
      return;
    }
    toast.success("Tâche créée");
    setTitle("");
    setAssignees([]);
    setBatteryCost(10);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" className="rounded-full" />}
      >
        + Tâche
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Nouvelle tâche</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-title">Titre</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sortir les poubelles"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="battery-cost">
              Coût de batterie : {batteryCost}%
            </Label>
            <input
              id="battery-cost"
              type="range"
              min={1}
              max={50}
              value={batteryCost}
              onChange={(e) => setBatteryCost(Number(e.target.value))}
              className="accent-primary"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Priorité</Label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  variant={priority === p.value ? "default" : "outline"}
                  className="flex-1 rounded-full"
                  onClick={() => setPriority(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Assigné·e·s</Label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleAssignee(m.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                    assignees.includes(m.id)
                      ? "border-foreground bg-accent"
                      : "opacity-70 hover:opacity-100",
                  )}
                >
                  <span
                    className="size-4 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  {m.display_name}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="rounded-full" disabled={loading}>
              Créer la tâche
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
