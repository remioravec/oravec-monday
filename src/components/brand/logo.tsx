import { cn } from "@/lib/utils";

type LogoProps = {
  variant?: "light" | "dark";
  showWordmark?: boolean;
  className?: string;
};

/** Marque Oravec : anneau tricolore (bleu / jaune / vert) + deux barres centrales. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden role="img">
      {/* Anneau : 3 arcs colorés, bouts arrondis */}
      <g fill="none" strokeWidth="11" strokeLinecap="round">
        {/* Bleu — haut-gauche */}
        <path d="M12.2,46.0 A38,38 0 0 1 50,12" stroke="#4285F4" />
        {/* Jaune — haut-droite */}
        <path d="M54,12.2 A38,38 0 0 1 87.8,46.0" stroke="#FBBC05" />
        {/* Vert — moitié basse */}
        <path d="M88,50 A38,38 0 0 1 12,50" stroke="#34A853" />
      </g>
      {/* Barres centrales (liste / tâches) */}
      <rect x="38" y="43" width="24" height="7" rx="3.5" fill="#cbd5e1" />
      <rect x="33" y="54" width="34" height="8" rx="4" fill="#94a3b8" />
    </svg>
  );
}

export function Logo({
  variant = "dark",
  showWordmark = true,
  className,
}: LogoProps) {
  const onLight = variant === "light";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="size-9 shrink-0" />
      {showWordmark && (
        <span
          className={cn(
            "text-lg font-semibold tracking-tight",
            onLight ? "text-white" : "text-foreground",
          )}
        >
          Oravec
        </span>
      )}
    </div>
  );
}
