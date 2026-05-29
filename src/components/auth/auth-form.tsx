"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {mode === "signup" && (
        <Field
          id="full_name"
          name="full_name"
          type="text"
          label="Prénom"
          placeholder="Votre prénom"
          icon={User}
          required
          autoFocus
        />
      )}
      <Field
        id="email"
        name="email"
        type="email"
        label="Email"
        placeholder="vous@exemple.com"
        icon={Mail}
        required
        autoComplete="email"
      />
      <Field
        id="password"
        name="password"
        type="password"
        label="Mot de passe"
        placeholder="••••••••"
        icon={Lock}
        required
        minLength={6}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
      />
      <Button
        type="submit"
        disabled={loading}
        className="mt-1 h-12 w-full rounded-xl bg-primary text-base font-medium text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.99]"
      >
        {loading ? (
          "…"
        ) : (
          <>
            {mode === "signup" ? "Créer mon compte" : "Se connecter"}
            <ArrowRight className="ml-1.5 size-4" />
          </>
        )}
      </Button>
    </form>
  );
}

type FieldProps = React.ComponentProps<"input"> & {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function Field({ label, icon: Icon, id, className, ...inputProps }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          {...inputProps}
          className={
            "h-12 w-full rounded-xl border border-input bg-background pl-11 pr-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:opacity-50 " +
            (className ?? "")
          }
        />
      </div>
    </div>
  );
}
