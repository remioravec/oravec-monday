"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PROFILE_COLOR_LIST } from "@/lib/design";
import { cn } from "@/lib/utils";

export function OnboardingForm() {
  const router = useRouter();
  const [householdName, setHouseholdName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState(PROFILE_COLOR_LIST[0].hex);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!householdName.trim() || !displayName.trim()) {
      toast.error("Tous les champs sont requis.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("setup_household", {
      p_household_name: householdName.trim(),
      p_display_name: displayName.trim(),
      p_color: color,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Foyer créé 🏡");
    router.push("/app");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-heading text-3xl">
          Bienvenue sur FamTask
        </CardTitle>
        <CardDescription>
          Crée ton foyer pour commencer. Tu pourras ajouter d&apos;autres
          membres ensuite.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="householdName">Nom du foyer</Label>
            <Input
              id="householdName"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="Famille Oravec"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName">Ton prénom</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Rémi"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Ta couleur signature</Label>
            <div className="flex gap-3">
              {PROFILE_COLOR_LIST.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  aria-label={c.label}
                  aria-pressed={color === c.hex}
                  className={cn(
                    "size-10 rounded-full transition-transform",
                    color === c.hex
                      ? "ring-2 ring-foreground ring-offset-2 scale-110"
                      : "hover:scale-105",
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
          <Button type="submit" className="rounded-full" disabled={loading}>
            Créer mon foyer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
