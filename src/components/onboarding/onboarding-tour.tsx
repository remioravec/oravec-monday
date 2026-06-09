"use client";

import { useState } from "react";
import { ArrowRight, Check, GraduationCap, Sparkles, X } from "lucide-react";
import { useUpdateMyProfile } from "@/lib/queries";

type Step = {
  emoji: string;
  title: string;
  body: string;
  hint?: string;
};

const STEPS: Step[] = [
  {
    emoji: "👋",
    title: "Bienvenue !",
    body: "On va faire un tour vite fait — 4 étapes, t'es prêt en 30 secondes.",
    hint: "Tu pourras relancer ce tuto depuis Mon profil.",
  },
  {
    emoji: "📁",
    title: "Dossiers & Projets",
    body: "À gauche, crée des dossiers pour organiser tes projets. Chaque projet = un tableau de tâches.",
    hint: "+ Dossier en haut → puis ajoute des projets dedans.",
  },
  {
    emoji: "✅",
    title: "Tâches & sous-tâches",
    body: "Dans un projet : statuts colorés (À faire / En cours / Fait), dates, assignés multiples. Déplie une tâche pour ses sous-tâches.",
    hint: "Sélectionne plusieurs tâches pour les éditer en lot (barre du bas).",
  },
  {
    emoji: "🔁",
    title: "Routines & habitudes",
    body: "Dans l'onglet « Routines », crée tes habitudes (tous les jours ou certains jours), coche-les chaque jour et suis ta régularité (série + 7 derniers jours).",
    hint: "La vue d'ensemble montre la charge équipe et les routines du jour.",
  },
];

export function OnboardingTour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const update = useUpdateMyProfile();
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  async function finish() {
    await update.mutateAsync({ onboarded_at: new Date().toISOString() });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4"
      style={{ fontFamily: "var(--font-handwritten)" }}
    >
      {/* Backdrop scribbles */}
      <svg
        aria-hidden
        className="pointer-events-none absolute left-10 top-10 hidden h-32 w-32 text-white/40 sm:block"
        viewBox="0 0 100 100"
      >
        <path
          d="M10 50 Q 30 10, 60 40 T 90 60"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="6 4"
        />
        <polyline
          points="80,55 90,60 82,68"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <svg
        aria-hidden
        className="pointer-events-none absolute bottom-10 right-10 hidden h-32 w-32 text-white/40 sm:block"
        viewBox="0 0 100 100"
      >
        <path
          d="M90 50 Q 70 90, 40 60 T 10 40"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="6 4"
        />
        <polyline
          points="20,45 10,40 18,32"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border-2 border-slate-300 bg-amber-50 shadow-2xl">
        {/* Notebook lines (subtle) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent 0 26px, #93c5fd 26px 27px)",
          }}
        />
        {/* Red margin */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-12 top-0 h-full w-px bg-rose-300/60"
        />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full text-slate-600 hover:bg-slate-200/60"
          aria-label="Fermer"
        >
          <X className="size-4" />
        </button>

        <div className="relative px-7 py-7 sm:px-10 sm:py-9">
          <header className="mb-4 flex items-center gap-2 text-slate-700">
            <GraduationCap className="size-5" />
            <span className="text-sm uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>
              Petit tutoriel
            </span>
            <span className="ml-auto text-xs tabular-nums text-slate-500" style={{ fontFamily: "var(--font-sans)" }}>
              {i + 1} / {STEPS.length}
            </span>
          </header>

          <div className="mb-5 flex items-start gap-3">
            <span className="text-4xl leading-none">{step.emoji}</span>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                {step.title}
              </h2>
            </div>
          </div>

          <p className="text-xl leading-snug text-slate-700 sm:text-2xl">
            {step.body}
          </p>

          {step.hint && (
            <div className="mt-5 flex items-start gap-2 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-100/80 p-3 text-base text-slate-700 sm:text-lg">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <span>{step.hint}</span>
            </div>
          )}

          <footer className="mt-7 flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className={`size-2 rounded-full transition-colors ${
                    idx === i ? "bg-primary w-6" : idx < i ? "bg-blue-300" : "bg-slate-300"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => setI((n) => n - 1)}
                  className="rounded-full px-4 py-2 text-base text-slate-700 hover:bg-slate-200/60"
                >
                  ← Retour
                </button>
              )}
              {last ? (
                <button
                  type="button"
                  onClick={finish}
                  disabled={update.isPending}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-lg font-bold text-white shadow-md hover:bg-primary/90"
                >
                  <Check className="size-4" />
                  C&apos;est parti !
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setI((n) => n + 1)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-lg font-bold text-white shadow-md hover:bg-primary/90"
                >
                  Suivant
                  <ArrowRight className="size-4" />
                </button>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
