import { NextResponse } from "next/server";
import { requireUser } from "@/lib/google/route-helpers";
import { getValidAccessToken, GoogleNotConnectedError } from "@/lib/google/server";

/**
 * Fournit un access_token Google frais au client (pour le Google Picker).
 * Le refresh_token reste côté serveur ; seul l'access_token court (~1h) sort.
 */
export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const accessToken = await getValidAccessToken(auth.userId);
    return NextResponse.json({ accessToken });
  } catch (e) {
    if (e instanceof GoogleNotConnectedError) {
      return NextResponse.json({ error: "google_not_connected" }, { status: 409 });
    }
    return NextResponse.json({ error: "token_error" }, { status: 500 });
  }
}
