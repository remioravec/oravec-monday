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

const ICONS = ["🏠", "🏖️", "🎒", "🩺", "🛒", "🎉", "🚗", "💰"];

export function AddFolderDialog({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("folders")
      .insert({ household_id: householdId, name: name.trim(), icon });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dossier créé");
    setName("");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="rounded-full" />}>
        + Dossier
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Nouveau dossier</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="folder-name">Nom</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Maison, Vacances 2026, École…"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Icône</Label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`flex size-10 items-center justify-center rounded-xl border text-xl ${
                    icon === i ? "border-foreground bg-accent" : ""
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="rounded-full" disabled={loading}>
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
