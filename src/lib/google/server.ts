import { createClient as createAdminSb } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Utilitaires Google côté serveur (service_role).
 * Gère le rafraîchissement de l'access_token à partir du refresh_token stocké.
 */

export function adminClient() {
  return createAdminSb<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export class GoogleNotConnectedError extends Error {
  constructor() {
    super("Compte Google non connecté");
    this.name = "GoogleNotConnectedError";
  }
}

interface RefreshResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

/**
 * Renvoie un access_token Google valide pour l'utilisateur, en le rafraîchissant
 * via le refresh_token si nécessaire. Persiste le nouveau token.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const admin = adminClient();
  const { data: conn, error } = await admin
    .from("google_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!conn || !conn.refresh_token) throw new GoogleNotConnectedError();

  const stillValid =
    conn.access_token &&
    conn.token_expires_at &&
    new Date(conn.token_expires_at).getTime() - 60_000 > Date.now();
  if (stillValid) return conn.access_token as string;

  // Rafraîchissement
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: conn.refresh_token,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Refresh token Google échoué: ${res.status} ${txt}`);
  }

  const json = (await res.json()) as RefreshResponse;
  const expiresAt = new Date(Date.now() + (json.expires_in - 60) * 1000).toISOString();

  await admin
    .from("google_connections")
    .update({
      access_token: json.access_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return json.access_token;
}

/** Fetch authentifié vers une API Google avec gestion d'erreur basique. */
export async function googleFetch(
  accessToken: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}
