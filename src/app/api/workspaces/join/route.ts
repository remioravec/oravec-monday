import { NextResponse } from "next/server";
import { createClient as createServerSb } from "@/lib/supabase/server";
import { createClient as createAdminSb } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Rejoint un espace de travail via un token d'invitation.
 * Utilise le service_role : un non-membre ne peut pas lire l'invitation
 * (RLS), donc on valide le token et on ajoute le membre côté serveur.
 */
export async function POST(req: Request) {
  const supabase = await createServerSb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { token } = (await req.json()) as { token?: string };
  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }

  const admin = createAdminSb<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: invite, error } = await admin
    .from("workspace_invites")
    .select("workspace_id, role, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !invite) {
    return NextResponse.json({ error: "Invitation invalide" }, { status: 404 });
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Invitation expirée" }, { status: 410 });
  }

  const { error: memErr } = await admin
    .from("workspace_members")
    .upsert(
      { workspace_id: invite.workspace_id, user_id: user.id, role: invite.role },
      { onConflict: "workspace_id,user_id", ignoreDuplicates: true },
    );
  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }

  return NextResponse.json({ workspaceId: invite.workspace_id });
}
