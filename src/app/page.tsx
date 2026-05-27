import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BatteryGauge } from "@/components/battery-gauge";
import { PROFILE_COLOR_LIST } from "@/lib/design";

const DEMO_FOYER = [
  { name: "Maman", color: "#5B7FFF", battery: 48 },
  { name: "Papa", color: "#FF6B9D", battery: 72 },
  { name: "Lina", color: "#FFB84D", battery: 91 },
  { name: "Noé", color: "#5DD39E", battery: 25 },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-5 py-12">
      <header className="flex flex-col gap-4">
        <Badge variant="secondary" className="w-fit rounded-full">
          MVP en construction
        </Badge>
        <h1 className="font-heading text-5xl font-semibold tracking-tight">
          FamTask
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          Gérez projets, tâches et routines à l&apos;échelle du foyer — avec une
          attention particulière à la <strong>charge mentale</strong> et une
          interface accessible <strong>dès 3 ans</strong>.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            className="rounded-full"
            render={<Link href="/login" />}
          >
            Créer mon foyer
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full"
            render={<Link href="/login" />}
          >
            Se connecter
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">
            🔋 Batteries du foyer
          </CardTitle>
          <CardDescription>
            Charge mentale prédite sur le cycle en cours — vert &lt; 60 %, orange
            60-85 %, rouge &gt; 85 %.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {DEMO_FOYER.map((m) => (
            <div key={m.name} className="flex items-center gap-3">
              <span
                className="size-8 shrink-0 rounded-full"
                style={{ backgroundColor: m.color }}
                aria-hidden
              />
              <BatteryGauge label={m.name} value={m.battery} className="flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-2xl font-semibold">
          Couleurs signature
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PROFILE_COLOR_LIST.map((c) => (
            <div
              key={c.key}
              className="flex flex-col gap-2 rounded-xl border bg-card p-4"
            >
              <span
                className="size-10 rounded-full"
                style={{ backgroundColor: c.hex }}
                aria-hidden
              />
              <span className="text-sm font-medium">{c.label}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {c.hex}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
