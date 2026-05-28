import { NextResponse } from "next/server";
import { createClient as createServerSb } from "@/lib/supabase/server";

/**
 * Résout l'utilisateur authentifié pour une route API.
 * Renvoie soit { userId }, soit { error } (réponse 401 prête à renvoyer).
 */
export async function requireUser(): Promise<
  { userId: string; error?: undefined } | { userId?: undefined; error: NextResponse }
> {
  const supabase = await createServerSb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }
  return { userId: user.id };
}
