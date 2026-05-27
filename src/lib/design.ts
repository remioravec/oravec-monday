/**
 * Design system — source unique des couleurs de profil et de la logique
 * d'affichage de la batterie (cf. cahier des charges §3.2 et §4.3).
 */

export type ProfileColorKey =
  | "parent-1"
  | "parent-2"
  | "child-1"
  | "child-2";

export interface ProfileColor {
  key: ProfileColorKey;
  /** Libellé lisible (FR). */
  label: string;
  /** Valeur hex de la couleur signature. */
  hex: string;
  /** Variable CSS exposée via @theme (utilisable en `bg-profile-*`). */
  token: string;
}

export const PROFILE_COLORS: Record<ProfileColorKey, ProfileColor> = {
  "parent-1": { key: "parent-1", label: "Bleu profond", hex: "#5B7FFF", token: "profile-parent-1" },
  "parent-2": { key: "parent-2", label: "Rose corail", hex: "#FF6B9D", token: "profile-parent-2" },
  "child-1": { key: "child-1", label: "Jaune soleil", hex: "#FFB84D", token: "profile-child-1" },
  "child-2": { key: "child-2", label: "Vert menthe", hex: "#5DD39E", token: "profile-child-2" },
};

export const PROFILE_COLOR_LIST: ProfileColor[] = Object.values(PROFILE_COLORS);

/**
 * Statut de batterie selon les seuils du cahier des charges :
 * vert < 60 %, orange 60-85 %, rouge > 85 %.
 */
export type BatteryStatus = "ok" | "warn" | "danger";

export const BATTERY_WARN_THRESHOLD = 60;
export const BATTERY_DANGER_THRESHOLD = 85;

export function batteryStatus(pct: number): BatteryStatus {
  if (pct > BATTERY_DANGER_THRESHOLD) return "danger";
  if (pct >= BATTERY_WARN_THRESHOLD) return "warn";
  return "ok";
}

/** Variable CSS de couleur correspondant au statut de batterie. */
export function batteryColorVar(pct: number): string {
  const status = batteryStatus(pct);
  return {
    ok: "var(--battery-ok)",
    warn: "var(--battery-warn)",
    danger: "var(--battery-danger)",
  }[status];
}
