import { NextResponse } from "next/server";
import { createClient as createServerSb } from "@/lib/supabase/server";
import { createClient as createAdminSb } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { GOOGLE_SCOPES } from "@/lib/google/scopes";

/**
 * Callback OAuth (PKCE) : échange le `code` contre une session, puis capture
 * les tokens Google (`provider_token` / `provider_refresh_token`) et les stocke
 * dans `google_connections` via le service_role (les tokens ne transitent jamais
 * par le client). Le refresh_token n'est renvoyé qu'au 1er consentement
 * (access_type=offline + prompt=consent) → on ne l'écrase pas s'il est absent.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/app";
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_no_code`);
  }

  const supabase = await createServerSb();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=oauth_exchange`);
  }

  const session = data.session;
  const providerToken = session.provider_token;
  const providerRefresh = session.provider_refresh_token;

  if (providerToken || providerRefresh) {
    try {
      const admin = createAdminSb<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      const patch: Database["public"]["Tables"]["google_connections"]["Insert"] = {
        user_id: session.user.id,
        google_email: session.user.email ?? null,
        access_token: providerToken ?? null,
        // Les access tokens Google durent ~1h ; marge de sécurité de 5 min.
        token_expires_at: new Date(Date.now() + 55 * 60_000).toISOString(),
        scopes: GOOGLE_SCOPES,
        updated_at: new Date().toISOString(),
      };
      // N'écrase le refresh_token que s'il est fourni (sinon on garde l'existant).
      if (providerRefresh) patch.refresh_token = providerRefresh;

      await admin
        .from("google_connections")
        .upsert(patch, { onConflict: "user_id" });
    } catch {
      // Le stockage des tokens ne doit pas bloquer la connexion.
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
