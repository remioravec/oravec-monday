"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { GOOGLE_SCOPES } from "@/lib/google/scopes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onGoogle() {
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // access_type=offline + prompt=consent → on obtient un refresh_token
          // (nécessaire pour appeler Drive/Calendar côté serveur plus tard).
          scopes: GOOGLE_SCOPES,
          redirectTo: `${window.location.origin}/auth/callback?next=/app`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
      // redirection gérée par Supabase → Google
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connexion Google échouée");
      setGoogleLoading(false);
    }
  }

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
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onGoogle}
        disabled={googleLoading}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-input bg-background text-sm font-medium text-foreground shadow-sm transition hover:bg-muted disabled:opacity-50"
      >
        <GoogleIcon className="size-4" />
        {googleLoading ? "Redirection…" : "Continuer avec Google"}
      </button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

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
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
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
