import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  ListChecks,
  Paperclip,
  Users,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ctaHref = user ? "/app" : "/login";
  const ctaLabel = user ? "Ouvrir l'app" : "Se connecter";

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-3">
            <Link
              href="#features"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Fonctionnalités
            </Link>
            <Button
              size="sm"
              className="rounded-xl bg-primary text-white hover:bg-primary/90"
              render={<Link href={ctaHref} />}
            >
              {ctaLabel}
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            background:
              "radial-gradient(circle at 15% 10%, #1a73e8, transparent 40%), radial-gradient(circle at 85% 30%, #34a853, transparent 40%), radial-gradient(circle at 50% 100%, #fbbc05, transparent 45%)",
          }}
        />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="size-1.5 rounded-full bg-brand-green" />
              Gestion de projet en équipe, en temps réel
            </span>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Gérez vos projets.
              <br />
              Suivez vos tâches.
              <br />
              <span className="text-primary">Avancez en équipe.</span>
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Dossiers, projets, tâches et sous-tâches, assignés multiples,
              routines récurrentes et vue d&apos;ensemble de la charge — le tout
              synchronisé en direct.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="h-12 rounded-xl bg-primary px-6 text-base text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.99]"
                render={<Link href={ctaHref} />}
              >
                {user ? "Ouvrir mon espace" : "Commencer"}
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl px-6 text-base"
                render={<Link href="#features" />}
              >
                Voir les fonctionnalités
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-sm text-muted-foreground">
              {["Sync temps réel", "Google Agenda & Drive", "Mobile (PWA)"].map(
                (f) => (
                  <li key={f} className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-brand-green" />
                    {f}
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* App mockup (placeholder — remplacer par une vraie capture/GIF) */}
          <div className="relative">
            <AppMockup />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Tout ce qu&apos;il faut pour avancer
            </h2>
            <p className="mt-3 text-muted-foreground">
              Pensé pour les équipes : clair, rapide, et synchronisé partout.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-10px_rgba(15,23,42,0.18)]"
              >
                <span
                  className="grid size-11 place-items-center rounded-xl"
                  style={{ backgroundColor: f.tint, color: f.color }}
                >
                  <f.icon className="size-5" />
                </span>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-brand-dark p-10 text-center text-white sm:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(circle at 20% 0%, rgba(255,255,255,0.25), transparent 45%), radial-gradient(circle at 80% 100%, rgba(13,29,72,0.6), transparent 50%)",
            }}
          />
          <div className="relative flex flex-col items-center gap-5">
            <LogoMark className="size-12" />
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Prêt à organiser votre équipe ?
            </h2>
            <Button
              size="lg"
              className="h-12 rounded-xl bg-white px-7 text-base font-medium text-primary shadow-sm transition-all hover:bg-white/90 active:scale-[0.99]"
              render={<Link href={ctaHref} />}
            >
              {ctaLabel}
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <div className="flex items-center gap-4">
            <Link
              href="/confidentialite"
              className="transition-colors hover:text-foreground"
            >
              Confidentialité
            </Link>
            <p>© {new Date().getFullYear()} Oravec. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: FolderKanban,
    title: "Projets & dossiers",
    description:
      "Organisez vos dossiers et projets, réordonnez tout par glisser-déposer.",
    tint: "#e8f0fe",
    color: "#1a73e8",
  },
  {
    icon: ListChecks,
    title: "Tâches & sous-tâches",
    description:
      "Statuts en pill, assignés multiples, échéances et heures, collage en masse.",
    tint: "#e6f4ea",
    color: "#34a853",
  },
  {
    icon: Users,
    title: "Charge par personne",
    description:
      "Vue d'ensemble de la charge de chaque membre, en un coup d'œil.",
    tint: "#fef7e0",
    color: "#f9ab00",
  },
  {
    icon: CalendarDays,
    title: "Calendrier & Google Agenda",
    description:
      "Vue calendrier, et synchronisation bidirectionnelle avec Google Agenda.",
    tint: "#e8f0fe",
    color: "#1a73e8",
  },
  {
    icon: Paperclip,
    title: "Pièces jointes & Drive",
    description:
      "Joignez des fichiers, depuis votre appareil ou directement depuis Google Drive.",
    tint: "#e6f4ea",
    color: "#34a853",
  },
  {
    icon: Zap,
    title: "Temps réel",
    description:
      "Tâches, statuts, assignés et avatars se mettent à jour en direct pour tous.",
    tint: "#fef7e0",
    color: "#f9ab00",
  },
] as const;

/** Mockup stylisé de l'app — placeholder à remplacer par une vraie capture/GIF. */
function AppMockup() {
  const rows = [
    { t: "Maquette page d'accueil", c: "#1a73e8", s: "En cours", sc: "#fbbc05" },
    { t: "Intégration paiement", c: "#34a853", s: "À faire", sc: "#94a3b8" },
    { t: "Tests end-to-end", c: "#a142f4", s: "Fait", sc: "#34a853" },
    { t: "Rédaction docs API", c: "#1a73e8", s: "En cours", sc: "#fbbc05" },
  ];
  return (
    <div className="rotate-1 rounded-2xl border border-border bg-card p-3 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)]">
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-2">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-xs font-medium text-muted-foreground">
            Refonte du site — tableau
          </span>
        </div>
        <ul className="divide-y bg-card">
          {rows.map((r) => (
            <li key={r.t} className="flex items-center gap-3 px-3 py-2.5">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: r.c }}
              />
              <span className="flex-1 truncate text-sm">{r.t}</span>
              <span className="flex -space-x-1.5">
                {[0, 1].map((i) => (
                  <span
                    key={i}
                    className="size-5 rounded-full ring-2 ring-card"
                    style={{ backgroundColor: i ? "#34a853" : "#1a73e8" }}
                  />
                ))}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ backgroundColor: r.sc }}
              >
                {r.s}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
