"use client";

import { useState } from "react";
import { Crown, Mail, Plus, Shield, ShieldCheck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useMyProfile,
  useProfiles,
  useResponsibilities,
  useToggleResponsibility,
} from "@/lib/queries";

export default function AdminPage() {
  const { data: me, isLoading: loadingMe } = useMyProfile();
  const { data: profiles = [], isLoading: loadingProfiles, refetch } =
    useProfiles();

  const [mode, setMode] = useState<"create" | "invite">("invite");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [submitting, setSubmitting] = useState(false);

  if (loadingMe) {
    return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  }
  if (me?.role !== "admin") {
    return (
      <div className="mx-auto w-full max-w-3xl p-6">
        <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <Shield className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Accès réservé</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cette page est réservée aux administrateurs.
          </p>
        </div>
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, email, password, full_name: fullName, role }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Action échouée");
      toast.success(
        mode === "invite"
          ? `Invitation envoyée à ${email}`
          : `Compte créé : ${email}`,
      );
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("member");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Administration
        </h1>
        <p className="text-sm text-muted-foreground">
          Crée des comptes pour ton équipe et gère leur rôle.
        </p>
      </header>

      <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Plus className="size-4 text-primary" />
            Ajouter un membre
          </h2>
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("invite")}
              className={`rounded-md px-3 py-1.5 font-medium ${mode === "invite" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Mail className="mr-1 inline size-3.5" />
              Inviter par email
            </button>
            <button
              type="button"
              onClick={() => setMode("create")}
              className={`rounded-md px-3 py-1.5 font-medium ${mode === "create" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Plus className="mr-1 inline size-3.5" />
              Créer manuellement
            </button>
          </div>
        </div>
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-name">Nom complet</Label>
            <Input
              id="new-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jean Dupont"
              required
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jean@exemple.com"
              required
              className="h-10"
            />
          </div>
          {mode === "create" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-pw">Mot de passe temporaire</Label>
              <Input
                id="new-pw"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                className="h-10"
                placeholder="6 caractères min"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label>Rôle</Label>
            <div className="flex gap-2">
              <RoleButton
                active={role === "member"}
                onClick={() => setRole("member")}
                icon={<UserIcon className="size-3.5" />}
                label="Membre"
              />
              <RoleButton
                active={role === "admin"}
                onClick={() => setRole("admin")}
                icon={<Crown className="size-3.5" />}
                label="Admin"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {submitting
                ? mode === "invite"
                  ? "Envoi…"
                  : "Création…"
                : mode === "invite"
                  ? "Envoyer l'invitation"
                  : "Créer le compte"}
            </Button>
          </div>
        </form>
      </section>

      <ResponsibilitiesPanel profiles={profiles} />

      <section className="rounded-2xl border bg-card shadow-sm">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">
            Équipe ({profiles.length})
          </h2>
        </header>
        {loadingProfiles ? (
          <div className="p-6 text-sm text-muted-foreground">Chargement…</div>
        ) : (
          <ul className="divide-y">
            {profiles.map((p) => {
              const initial = (p.full_name ?? "?").trim().charAt(0).toUpperCase();
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30"
                >
                  <Avatar
                    className="size-10"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.avatar_url && (
                      <AvatarImage src={p.avatar_url} alt={p.full_name ?? ""} />
                    )}
                    <AvatarFallback
                      className="text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">
                      {p.full_name ?? "Sans nom"}
                    </div>
                  </div>
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      p.role === "admin"
                        ? "bg-accent text-accent-foreground"
                        : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {p.role === "admin" ? (
                      <ShieldCheck className="size-3" />
                    ) : (
                      <UserIcon className="size-3" />
                    )}
                    {p.role}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function ResponsibilitiesPanel({
  profiles,
}: {
  profiles: ReturnType<typeof useProfiles>["data"] extends (infer T)[] | undefined
    ? T[]
    : never;
}) {
  const { data: links = [] } = useResponsibilities();
  const toggle = useToggleResponsibility();
  const [parent, setParent] = useState<string>("");
  const [child, setChild] = useState<string>("");

  const linksByParent = new Map<string, string[]>();
  for (const l of links) {
    const arr = linksByParent.get(l.parent_id) ?? [];
    arr.push(l.child_id);
    linksByParent.set(l.parent_id, arr);
  }
  const profilesById = new Map(profiles.map((p) => [p.id, p]));

  async function add() {
    if (!parent || !child || parent === child) {
      toast.error("Choisis un parent et un enfant différents");
      return;
    }
    try {
      await toggle.mutateAsync({ parentId: parent, childId: child, link: true });
      toast.success("Lien créé");
      setChild("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
        <UserIcon className="size-4 text-primary" />
        Responsabilités
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Un « parent » voit dans sa vue d&apos;ensemble les routines et la charge
        des membres dont il est responsable.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={parent}
          onChange={(e) => setParent(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Choisir un parent…</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">est responsable de</span>
        <select
          value={child}
          onChange={(e) => setChild(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Choisir un enfant…</option>
          {profiles
            .filter((p) => p.id !== parent)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
        </select>
        <Button
          onClick={add}
          disabled={!parent || !child}
          className="bg-primary text-white hover:bg-primary/90"
        >
          <Plus className="size-3.5" />
          Lier
        </Button>
      </div>

      {linksByParent.size === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-xs italic text-muted-foreground">
          Aucun lien défini.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {Array.from(linksByParent.entries()).map(([pid, children]) => {
            const p = profilesById.get(pid);
            return (
              <li
                key={pid}
                className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-3"
              >
                <span className="text-sm font-medium">
                  {p?.full_name ?? "?"}
                </span>
                <span className="text-xs text-muted-foreground">→</span>
                {children.map((cid) => {
                  const c = profilesById.get(cid);
                  return (
                    <span
                      key={cid}
                      className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground ring-1 ring-blue-200"
                    >
                      {c?.full_name ?? "?"}
                      <button
                        type="button"
                        onClick={() =>
                          toggle.mutate({
                            parentId: pid,
                            childId: cid,
                            link: false,
                          })
                        }
                        className="ml-0.5 text-accent-foreground hover:text-blue-900"
                        aria-label={`Retirer ${c?.full_name ?? ""}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RoleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-colors",
        active
          ? "border-primary bg-accent text-accent-foreground"
          : "border-input bg-background text-foreground hover:bg-muted",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}
