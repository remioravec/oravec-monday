import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthHero } from "@/components/auth/auth-hero";
import { Logo, LogoMark } from "@/components/brand/logo";

export default function LoginPage() {
  return (
    <div className="grid min-h-[100dvh] w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <AuthHero />

      <main className="relative flex flex-col items-center justify-center bg-background px-6 py-10">
        <div className="absolute left-6 top-6 lg:hidden">
          <Logo />
        </div>

        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18)] sm:p-12">
          <div className="mb-8 flex flex-col items-center text-center">
            <LogoMark className="mb-5 size-14" />
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              Bienvenue <span aria-hidden>👋</span>
            </h1>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Connectez-vous pour accéder à votre dashboard
            </p>
          </div>

          <AuthForm mode="login" />

          <p className="mt-7 text-center text-xs text-muted-foreground">
            Contactez votre administrateur pour obtenir vos identifiants.
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Inscrivez-vous
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
