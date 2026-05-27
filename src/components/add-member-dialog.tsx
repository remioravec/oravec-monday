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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PROFILE_COLOR_LIST } from "@/lib/design";
import { cn } from "@/lib/utils";

export function AddMemberDialog({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [childMode, setChildMode] = useState<"reader" | "kid">("reader");
  const [color, setColor] = useState(PROFILE_COLOR_LIST[2].hex);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").insert({
      household_id: householdId,
      role: "child",
      child_mode: childMode,
      display_name: name.trim(),
      color,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${name.trim()} ajouté·e au foyer`);
    setName("");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="rounded-full" />}
      >
        + Membre
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Ajouter un enfant</DialogTitle>
          <DialogDescription>
            La connexion par code PIN sera disponible bientôt — pour l&apos;instant
            le profil sert à l&apos;assignation et à la batterie.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="member-name">Prénom</Label>
            <Input
              id="member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lina"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Type de profil</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={childMode === "reader" ? "default" : "outline"}
                className="flex-1 rounded-full"
                onClick={() => setChildMode("reader")}
              >
                Lecteur (≥ 6 ans)
              </Button>
              <Button
                type="button"
                variant={childMode === "kid" ? "default" : "outline"}
                className="flex-1 rounded-full"
                onClick={() => setChildMode("kid")}
              >
                Kid (3-5 ans)
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Couleur</Label>
            <div className="flex gap-3">
              {PROFILE_COLOR_LIST.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  aria-label={c.label}
                  className={cn(
                    "size-9 rounded-full transition-transform",
                    color === c.hex
                      ? "ring-2 ring-foreground ring-offset-2 scale-110"
                      : "hover:scale-105",
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="rounded-full" disabled={loading}>
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
