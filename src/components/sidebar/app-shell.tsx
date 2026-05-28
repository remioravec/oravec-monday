"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import { Logo } from "@/components/brand/logo";
import { OnboardingHost } from "@/components/onboarding/onboarding-host";
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

        <main className="flex-1 overflow-x-auto">{children}</main>
      </div>
      <OnboardingHost />
    </div>
  );
}
