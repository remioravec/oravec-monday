"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  useMyProfile,
  useUpdateMyProfile,
  type Profile,
} from "@/lib/queries";
import { NotificationsPanel } from "@/components/settings/notifications-panel";

const COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#475569",
];

export default function ProfileSettingsPage() {
  const { data: me, isLoading } = useMyProfile();

  if (isLoading || !me) {
    return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  }
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <ProfileForm key={me.id} me={me} />
      <NotificationsPanel />
    </div>
  );
}

function ProfileForm({ me }: { me: Profile }) {
  const update = useUpdateMyProfile();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(me.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(me.avatar_url ?? "");
  const [color, setColor] = useState(me.color);
  const [uploading, setUploading] = useState(false);

  const initial = (fullName.trim() || me.full_name || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Choisis un fichier image");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image trop lourde (max 3 Mo)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${me.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      setAvatarUrl(url);
      await update.mutateAsync({ avatar_url: url });
      toast.success("Avatar mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload échoué");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemoveAvatar() {
    setAvatarUrl("");
    await update.mutateAsync({ avatar_url: null });
    toast.success("Avatar retiré");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({
        full_name: fullName.trim() || undefined,
        avatar_url: avatarUrl.trim() || null,
        color,
      });
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Mon profil</h1>
        <p className="text-sm text-muted-foreground">
          Personnalise ton nom, ta couleur, ton avatar et tes notifications.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="size-20" style={{ backgroundColor: color }}>
            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
            <AvatarFallback
              className="text-white text-2xl font-semibold"
              style={{ backgroundColor: color }}
            >
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 min-w-[180px] flex-col gap-2">
            <div className="text-sm">
              <div className="font-medium text-foreground">{me.full_name}</div>
              <div className="text-muted-foreground">
                Rôle :{" "}
                <span className="font-medium text-foreground capitalize">
                  {me.role}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                {uploading ? "Upload…" : "Charger une photo"}
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  className="text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Retirer
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="full_name">Nom affiché</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Votre prénom"
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="avatar_url">URL de l&apos;avatar (avancé)</Label>
            <Input
              id="avatar_url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Ou colle directement une URL publique.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Couleur de profil</Label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Choisir ${c}`}
                className={[
                  "size-8 rounded-full border-2 transition-all",
                  color === c
                    ? "scale-110 border-foreground"
                    : "border-transparent hover:scale-105",
                ].join(" ")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="submit"
            disabled={update.isPending}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </>
  );
}
