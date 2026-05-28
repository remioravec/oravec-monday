"use client";

import { WorkloadCard } from "@/components/overview/workload-card";
import { useWorkload } from "@/lib/queries";

export default function OverviewPage() {
  const { data, isLoading } = useWorkload();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Vue d&apos;ensemble</h1>
        <p className="text-sm text-muted-foreground">
          Charge de travail par personne — à faire (gris), en cours (orange), fait (vert).
        </p>
      </header>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucun profil pour l&apos;instant. Crée des tâches et assigne-les pour voir
          la charge apparaître.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((row) => (
            <WorkloadCard key={row.user_id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
