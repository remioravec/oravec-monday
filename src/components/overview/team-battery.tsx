"use client";

import { TrendingUp } from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type Workload = Database["public"]["Views"]["person_workload"]["Row"];

const STATUS_COLORS = {
  a_faire: "var(--status-todo)",
  en_cours: "var(--status-doing)",
  fait: "var(--status-done)",
} as const;

export function TeamBattery({ workload }: { workload: Workload[] }) {
  const totals = workload.reduce(
    (acc, w) => ({
      total: acc.total + (w.total ?? 0),
      a_faire: acc.a_faire + (w.a_faire ?? 0),
      en_cours: acc.en_cours + (w.en_cours ?? 0),
      fait: acc.fait + (w.fait ?? 0),
    }),
    { total: 0, a_faire: 0, en_cours: 0, fait: 0 },
  );
  const pct = totals.total > 0 ? Math.round((totals.fait / totals.total) * 100) : 0;

  return (
    <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary via-primary to-brand-dark p-6 text-white shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-white/80">
            <TrendingUp className="size-4" />
            Avancement global de l&apos;équipe
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-5xl font-semibold tabular-nums">{pct}%</span>
            <span className="text-sm text-white/80">
              {totals.fait} / {totals.total} tâche{totals.total > 1 ? "s" : ""} faites
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right text-xs">
          <Stat label="À faire" value={totals.a_faire} dot="#cbd5e1" />
          <Stat label="En cours" value={totals.en_cours} dot="#fbbf24" />
          <Stat label="Faites" value={totals.fait} dot="#34d399" />
        </div>
      </div>

      <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-blue-800/60">
        {totals.total > 0 && (
          <>
            <Seg w={totals.a_faire / totals.total} color={STATUS_COLORS.a_faire} />
            <Seg w={totals.en_cours / totals.total} color={STATUS_COLORS.en_cours} />
            <Seg w={totals.fait / totals.total} color={STATUS_COLORS.fait} />
          </>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-3 py-2 text-left ring-1 ring-white/10">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/80">
        <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: dot }} />
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Seg({ w, color }: { w: number; color: string }) {
  if (w <= 0) return null;
  return <div className="h-full" style={{ width: `${w * 100}%`, backgroundColor: color }} />;
}
