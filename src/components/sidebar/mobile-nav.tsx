"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Calendar, FolderTree, User } from "lucide-react";

/**
 * Barre de navigation basse (mobile uniquement). Pensée pour le pouce :
 * grandes cibles tactiles, accès direct aux écrans principaux. Le bouton
 * « Projets » ouvre le tiroir latéral (dossiers / projets / création).
 */
export function MobileNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t bg-card/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation principale"
    >
      <Tab
        href="/app"
        active={pathname === "/app"}
        icon={<LayoutGrid className="size-5" />}
        label="Accueil"
      />
      <Tab
        href="/app/calendar"
        active={pathname === "/app/calendar"}
        icon={<Calendar className="size-5" />}
        label="Calendrier"
      />
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors active:bg-muted/60"
      >
        <FolderTree className="size-5" />
        Projets
      </button>
      <Tab
        href="/app/settings/profile"
        active={pathname.startsWith("/app/settings")}
        icon={<User className="size-5" />}
        label="Profil"
      />
    </nav>
  );
}

function Tab({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors active:bg-muted/60",
        active ? "text-primary" : "text-muted-foreground",
      ].join(" ")}
    >
      {icon}
      {label}
    </Link>
  );
}
