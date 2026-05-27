"use client";

import { batteryColorVar, batteryStatus } from "@/lib/design";
import { cn } from "@/lib/utils";

interface BatteryGaugeProps {
  /** Charge prédite sur le cycle, 0-100. */
  value: number;
  /** Nom du profil, affiché à gauche. */
  label?: string;
  /** Taille de la jauge. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const HEIGHTS = { sm: "h-2", md: "h-3", lg: "h-4" } as const;

/**
 * Jauge de batterie horizontale à couleur dynamique.
 * La valeur est PRÉDICTIVE (somme des coûts des tâches du cycle), pas réactive.
 */
export function BatteryGauge({
  value,
  label,
  size = "md",
  className,
}: BatteryGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const status = batteryStatus(clamped);
  const color = batteryColorVar(clamped);

  return (
    <div className={cn("flex w-full items-center gap-3", className)}>
      {label && (
        <span className="min-w-0 shrink-0 truncate text-sm font-medium">
          {label}
        </span>
      )}
      <div
        className={cn(
          "relative flex-1 overflow-hidden rounded-full bg-muted",
          HEIGHTS[size],
        )}
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `Batterie de ${label}` : "Batterie"}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums"
        style={{ color }}
        data-status={status}
      >
        {clamped}%
      </span>
    </div>
  );
}
