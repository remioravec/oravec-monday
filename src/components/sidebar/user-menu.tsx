"use client";

import Link from "next/link";
import {
  ChevronUp,
  Download,
  GraduationCap,
  LogOut,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useMyProfile, useSignOut } from "@/lib/queries";
import { triggerOnboarding } from "@/components/onboarding/onboarding-host";
import { usePwaInstall } from "@/lib/pwa-install";
import { isIOS, isStandalone } from "@/lib/push";

export function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { data: me, isLoading } = useMyProfile();
  const signOut = useSignOut();
  const { canInstall, install } = usePwaInstall();
  // Déjà installée (mode plein écran) → inutile de proposer l'installation.
  const showInstall = !isStandalone();

  async function handleInstall() {
    if (canInstall) {
      const outcome = await install();
      if (outcome === "accepted") toast.success("Application installée");
      return;
    }
    if (isIOS()) {
      toast.info(
        "Sur iPhone : appuie sur Partager, puis « Sur l'écran d'accueil » pour installer l'app.",
        { duration: 8000 },
      );
      return;
    }
    toast.info(
      "Utilise le menu de ton navigateur (⋮ → Installer l'application) pour l'ajouter à ton appareil.",
      { duration: 8000 },
    );
  }

  if (isLoading || !me) {
    return (
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="size-9 animate-pulse rounded-full bg-muted" />
        <div className="flex-1">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  const initial = (me.full_name ?? "?").trim().charAt(0).toUpperCase();
  const isAdmin = me.role === "admin";

  async function handleSignOut() {
    try {
      await signOut.mutateAsync();
      window.location.href = "/login";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            aria-label="Menu utilisateur"
          />
        }
      >
        <Avatar className="size-9" style={{ backgroundColor: me.color }}>
          {me.avatar_url && (
            <AvatarImage src={me.avatar_url} alt={me.full_name ?? ""} />
          )}
          <AvatarFallback
            className="text-sm font-semibold text-white"
            style={{ backgroundColor: me.color }}
          >
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1 truncate text-sm font-medium">
            {me.full_name}
            {isAdmin && (
              <ShieldCheck
                className="size-3.5 shrink-0 text-primary"
                aria-label="Administrateur"
              />
            )}
          </div>
          <div className="truncate text-[11px] text-muted-foreground capitalize">
            {me.role}
          </div>
        </div>
        <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-60">
        <DropdownMenuLabel>{me.full_name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href="/app/settings/profile" onClick={onNavigate} />
          }
        >
          <UserCog className="size-3.5" />
          Mon profil
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem
            render={
              <Link href="/app/settings/admin" onClick={onNavigate} />
            }
          >
            <ShieldCheck className="size-3.5" />
            Administration
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {showInstall && (
          <DropdownMenuItem onClick={handleInstall}>
            <Download className="size-3.5" />
            Installer l&apos;application
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => triggerOnboarding()}>
          <GraduationCap className="size-3.5" />
          Revoir le tutoriel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut className="size-3.5" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
