"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary du segment /app : remplace le crash générique par un message
 * lisible (avec le détail de l'erreur) et permet de réessayer sans recharger.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Visible dans la console navigateur pour diagnostic.
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
      <h2 className="text-xl font-semibold tracking-tight">
        Une erreur est survenue
      </h2>
      <p className="text-sm text-muted-foreground">
        {error.message || "Erreur inconnue."}
        {error.digest ? ` (réf : ${error.digest})` : ""}
      </p>
      <div className="flex items-center gap-2">
        <Button onClick={reset}>Réessayer</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Recharger
        </Button>
      </div>
    </div>
  );
}
