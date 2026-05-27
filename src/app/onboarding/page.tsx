import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const profile = await getCurrentProfile();
  if (profile) redirect("/app");

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <OnboardingForm />
    </main>
  );
}
