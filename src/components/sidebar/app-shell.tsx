"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import { MobileNav } from "./mobile-nav";
import { Logo } from "@/components/brand/logo";
import { NotificationPrompt } from "@/components/notifications/notification-prompt";
import { AddTaskFab } from "@/components/tasks/add-task-fab";
import { OnboardingHost } from "@/components/onboarding/onboarding-host";
import { useRealtimeProfiles } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Avatars/noms à jour en direct entre utilisateurs.
  useRealtimeProfiles();

  return (
    <div className="flex min-h-svh">
      {/* Sidebar desktop (≥768px) */}
      <aside className="hidden w-72 shrink-0 border-r bg-sidebar md:flex">
        <AppSidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <header className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Menu" />}
            >
              <Menu />
            </SheetTrigger>
            <SheetContent
              side="left"
              className="!w-72 !max-w-[80vw] p-0"
              showCloseButton={false}
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SheetDescription className="sr-only">
                Dossiers, projets et navigation principale.
              </SheetDescription>
              <AppSidebar onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <Logo />
        </header>

        {/* pb pour ne pas masquer le contenu derrière la barre basse mobile */}
        <main className="flex-1 overflow-x-auto pb-16 md:pb-0">{children}</main>
      </div>

      {/* Invite à activer les notifications (mobile) */}
      <NotificationPrompt />

      {/* Barre de navigation basse (mobile) */}
      <MobileNav onOpenMenu={() => setMobileOpen(true)} />

      {/* Bouton flottant « + » pour créer une tâche (toutes pages) */}
      <AddTaskFab />

      <OnboardingHost />
    </div>
  );
}
