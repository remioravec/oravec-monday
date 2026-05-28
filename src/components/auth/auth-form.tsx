"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const fullName = String(fd.get("full_name") || "");

    setLoading(true);
    try {
      // Client créé ici (et non au render) : le prerender statique de
      // /login + /signup ne doit pas instancier de client Supabase, sinon
      // le build casse quand les env vars NEXT_PUBLIC_* sont absentes.
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName || email } },
        });
        if (error) throw error;
        toast.success("Compte créé. Connexion en cours…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      router.replace("/app");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {mode === "signup" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="full_name">Prénom (visible par l&apos;équipe)</Label>
          <Input id="full_name" name="full_name" type="text" required autoFocus />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </div>
      <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full">
        {loading
          ? "…"
          : mode === "signup"
            ? "Créer mon compte"
            : "Se connecter"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "signup" ? (
          <>
            Déjà un compte ?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Se connecter
            </Link>
          </>
        ) : (
          <>
            Pas de compte ?{" "}
            <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
              Créer un compte
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
