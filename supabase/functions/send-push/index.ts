// Edge Function : envoi de notifications Web Push.
// Appelée par l'app (supabase.functions.invoke("send-push", { body })) lors
// d'événements (assignation, etc.). Lit les abonnements de la cible et envoie
// la notif via VAPID.
//
// Secrets requis (Supabase → Edge Functions → Secrets) :
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ex: mailto:admin@…)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sont injectés automatiquement.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@oravec.fr";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

interface Payload {
  userId?: string;
  userIds?: string[];
  title?: string;
  body?: string;
  url?: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response(JSON.stringify({ error: "VAPID non configuré" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let p: Payload;
  try {
    p = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON invalide" }), { status: 400 });
  }

  const targets = p.userIds ?? (p.userId ? [p.userId] : []);
  if (targets.length === 0) {
    return new Response(JSON.stringify({ error: "Aucune cible" }), { status: 400 });
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", targets);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const payload = JSON.stringify({
    title: p.title ?? "Oravec",
    body: p.body ?? "",
    url: p.url ?? "/app",
  });

  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        // Abonnement expiré → on le supprime
        if (code === 404 || code === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }),
  );

  return new Response(JSON.stringify({ sent, total: subs?.length ?? 0 }), {
    headers: { "Content-Type": "application/json" },
  });
});
