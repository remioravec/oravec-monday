"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/lib/workspace-store";

export default function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const setCurrent = useWorkspaceStore((s) => s.setCurrent);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/workspaces/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (res.status === 401) {
          // Pas connecté → login puis retour sur ce lien.
          router.replace(`/login?next=/join/${token}`);
          return;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Invitation invalide");
        if (cancelled) return;
        if (json.workspaceId) setCurrent(json.workspaceId);
        router.replace("/app");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router, setCurrent]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <LogoMark className="size-12" />
      {error ? (
        <>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => router.replace("/app")} variant="outline">
            Aller à l&apos;app
          </Button>
        </>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Connexion à l&apos;espace de travail…
        </p>
      )}
    </div>
  );
}
