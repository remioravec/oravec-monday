import { NextResponse } from "next/server";
import { createClient as createServerSbClient } from "@/lib/supabase/server";
import { createClient as createAdminSbClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

async function requireAdmin() {
  const supabase = await createServerSbClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") {
    return { error: NextResponse.json({ error: "Réservé aux admins" }, { status: 403 }) };
  }
  const admin = createAdminSbClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return { admin };
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const body = (await req.json()) as {
    mode?: "create" | "invite";
    email?: string;
    password?: string;
    full_name?: string;
    role?: "admin" | "member";
  };
  const mode = body.mode === "invite" ? "invite" : "create";
  const email = body.email?.trim();
  const fullName = body.full_name?.trim() || email;
  const role = body.role === "admin" ? "admin" : "member";

  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  let userId: string | null = null;

  if (mode === "invite") {
    const { data: invited, error } =
      await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
      });
    if (error || !invited.user) {
      return NextResponse.json(
        { error: error?.message ?? "Invitation échouée" },
        { status: 400 },
      );
    }
    userId = invited.user.id;
  } else {
    const password = body.password?.trim();
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Mot de passe (min 6 caractères) requis" },
        { status: 400 },
      );
    }
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !created.user) {
      return NextResponse.json(
        { error: error?.message ?? "Création échouée" },
        { status: 400 },
      );
    }
    userId = created.user.id;
  }

  if (role === "admin" && userId) {
    await admin.from("profiles").update({ role: "admin" }).eq("id", userId);
  }

  return NextResponse.json({ id: userId, email, role, mode }, { status: 201 });
}
