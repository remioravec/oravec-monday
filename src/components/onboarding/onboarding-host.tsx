"use client";

import { useEffect, useState } from "react";
import { OnboardingTour } from "./onboarding-tour";
import { useMyProfile } from "@/lib/queries";

export const ONBOARDING_OPEN_EVENT = "oravec:onboarding:open";

export function OnboardingHost() {
  const { data: me } = useMyProfile();
  const [forceOpen, setForceOpen] = useState(false);

  useEffect(() => {
    function handler() {
      setForceOpen(true);
    }
    window.addEventListener(ONBOARDING_OPEN_EVENT, handler);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, handler);
  }, []);

  const shouldAutoOpen = !!me && !me.onboarded_at;
  const open = forceOpen || shouldAutoOpen;
  if (!open) return null;
  return <OnboardingTour onClose={() => setForceOpen(false)} />;
}

export function triggerOnboarding() {
  window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT));
}
