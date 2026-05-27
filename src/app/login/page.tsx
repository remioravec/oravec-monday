"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle(mode: "signin" | "signup") {
    if (!email || !password) {
      toast.error("Email et mot de passe requis.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    if (mode === "signup") toast.success("Compte créé 🎉");
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-3xl">FamTask</CardTitle>
          <CardDescription>
            Connecte-toi en tant que parent pour gérer ton foyer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handle("signin");
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@exemple.fr"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              className="rounded-full"
              disabled={loading}
            >
              Se connecter
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={loading}
              onClick={() => handle("signup")}
            >
              Créer un compte
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
