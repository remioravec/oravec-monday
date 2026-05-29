import { LayoutDashboard, ListChecks, Repeat } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Projets organisés",
    description: "Regroupez vos dossiers et projets dans un espace clair.",
  },
  {
    icon: ListChecks,
    title: "Tâches & sous-tâches",
    description: "Statuts en pill, assignés multiples, due dates inline.",
  },
  {
    icon: Repeat,
    title: "Routines récurrentes",
    description: "Générez automatiquement les tâches du quotidien.",
  },
];

export function AuthHero() {
  return (
    <aside className="relative hidden h-full flex-col overflow-hidden bg-white lg:flex">
      {/* Logo sur fond blanc */}
      <div className="px-8 py-6">
        <Logo />
      </div>

      {/* Panneau dégradé : démarre par un arrondi juste sous le logo */}
      <div className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-t-[2rem] bg-gradient-to-br from-primary via-primary to-brand-dark p-10 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, rgba(255,255,255,0.25), transparent 45%), radial-gradient(circle at 80% 100%, rgba(13,29,72,0.6), transparent 50%)",
        }}
      />

      <div className="relative flex flex-col gap-10">
        <div className="space-y-2">
          <h2 className="text-3xl font-light italic leading-tight">
            Gérez vos projets.
          </h2>
          <h2 className="text-3xl font-semibold leading-tight">
            Suivez vos tâches.
          </h2>
          <h2 className="text-3xl font-semibold leading-tight">
            Avancez en équipe.
          </h2>
        </div>

        <ul className="flex flex-col gap-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                <Icon className="size-[18px] text-white" strokeWidth={2} />
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{title}</span>
                <span className="text-xs text-white/75">{description}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/60">
        © {new Date().getFullYear()} Oravec. Tous droits réservés.
      </p>
      </div>
    </aside>
  );
}
