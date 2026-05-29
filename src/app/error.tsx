"use client";

import { useEffect } from "react";

/**
 * Garde-fou de segment racine : capture les erreurs des layouts enfants
 * (ex. /app/layout → AppShell) et affiche le détail réel.
 */
export default function RootSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root segment error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
      <pre className="w-full whitespace-pre-wrap break-words rounded-xl border border-border bg-card p-3 text-left text-[13px] text-destructive">
        {error?.message || "Erreur inconnue"}
        {error?.digest ? `\n\n(réf : ${error.digest})` : ""}
      </pre>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="h-11 rounded-xl bg-primary px-5 font-medium text-white"
        >
          Réessayer
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="h-11 rounded-xl border border-input px-5"
        >
          Accueil
        </button>
      </div>
    </div>
  );
}
