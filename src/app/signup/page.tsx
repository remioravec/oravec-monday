import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthHero } from "@/components/auth/auth-hero";
import { Logo } from "@/components/brand/logo";

export default function SignupPage() {
  return (
    <div className="grid min-h-[100dvh] w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <AuthHero />

      <main className="relative flex flex-col items-center justify-center bg-background px-6 py-10">
        <div className="absolute left-6 top-6 lg:hidden">
          <Logo />
        </div>

        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[0_8px_30px_-10px_rgba(15,23,42,0.15)] sm:p-10">
          <div className="mb-7 flex flex-col items-center text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Créer un compte
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Configurez vos dossiers, projets et routines en quelques clics.
            </p>
          </div>

          <Suspense fallback={null}>
            <AuthForm mode="signup" />
          </Suspense>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Déjà inscrit ?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
