// Test end-to-end du backend FamTask contre la Supabase locale.
// Rejoue le parcours réel de l'app + vérifie quelques règles RLS clés.
// Usage : node scripts/e2e-test.mjs
import { createClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54321";
const ANON = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

const ok = (m) => console.log(`✅ ${m}`);
const fail = (m, e) => {
  console.error(`❌ ${m}`, e?.message ?? e ?? "");
  process.exitCode = 1;
};

const rnd = Math.random().toString(36).slice(2, 8);
const parentEmail = `parent_${rnd}@test.fr`;

const sb = createClient(URL, ANON);

// 1. Inscription parent (local : auto-confirmé)
{
  const { error } = await sb.auth.signUp({ email: parentEmail, password: "password123" });
  if (error) fail("signUp parent", error);
  else ok(`signUp parent ${parentEmail}`);
}

// 2. Création du foyer + profil parent via RPC
let householdId;
{
  const { data, error } = await sb.rpc("setup_household", {
    p_household_name: "Famille Test",
    p_display_name: "Rémi",
    p_color: "#5B7FFF",
  });
  if (error) fail("setup_household", error);
  else {
    householdId = data;
    ok(`foyer créé ${householdId}`);
  }
}

// 3. Ajout d'un enfant
let childId;
{
  const { data, error } = await sb
    .from("profiles")
    .insert({
      household_id: householdId,
      role: "child",
      child_mode: "kid",
      display_name: "Lina",
      color: "#FFB84D",
    })
    .select("id")
    .single();
  if (error) fail("insert enfant", error);
  else {
    childId = data.id;
    ok(`enfant créé ${childId}`);
  }
}

// 4. Dossier → projet → tâche → assignation
let projectId, taskId;
{
  const { data: folder, error: fErr } = await sb
    .from("folders")
    .insert({ household_id: householdId, name: "Maison", icon: "🏠" })
    .select("id")
    .single();
  if (fErr) fail("insert dossier", fErr);
  else ok("dossier créé");

  const { data: project, error: pErr } = await sb
    .from("projects")
    .insert({ folder_id: folder.id, name: "Ménage" })
    .select("id")
    .single();
  if (pErr) fail("insert projet", pErr);
  else {
    projectId = project.id;
    ok("projet créé");
  }

  const { data: task, error: tErr } = await sb
    .from("tasks")
    .insert({ project_id: projectId, title: "Ranger sa chambre", battery_cost: 20 })
    .select("id")
    .single();
  if (tErr) fail("insert tâche", tErr);
  else {
    taskId = task.id;
    ok("tâche créée");
  }

  const { error: aErr } = await sb
    .from("task_assignees")
    .insert({ task_id: taskId, profile_id: childId });
  if (aErr) fail("assignation", aErr);
  else ok("tâche assignée à l'enfant");
}

// 5. Lecture façon dashboard
{
  const { data, error } = await sb
    .from("tasks")
    .select("title, battery_cost, status, task_assignees(profile_id)")
    .order("created_at");
  if (error) fail("select dashboard", error);
  else ok(`dashboard : ${data.length} tâche(s), 1ère assignée à ${data[0]?.task_assignees.length} membre(s)`);
}

// 6. RLS : le pin_hash ne doit JAMAIS être lisible (§5.3)
{
  const { data, error } = await sb.from("profile_credentials").select("*");
  if (error) ok(`profile_credentials inaccessible (erreur attendue : ${error.code})`);
  else if ((data ?? []).length === 0) ok("profile_credentials renvoie 0 ligne (RLS sans policy)");
  else fail("FUITE : profile_credentials lisible !", JSON.stringify(data));
}

// 7. RLS : isolation entre foyers — un 2e parent ne voit pas le foyer du 1er
{
  const sb2 = createClient(URL, ANON);
  await sb2.auth.signUp({ email: `parent2_${rnd}@test.fr`, password: "password123" });
  await sb2.rpc("setup_household", {
    p_household_name: "Autre Famille",
    p_display_name: "Autre",
    p_color: "#FF6B9D",
  });
  const { data } = await sb2.from("tasks").select("id, title");
  const leaked = (data ?? []).some((t) => t.id === taskId);
  if (leaked) fail("FUITE : le 2e foyer voit les tâches du 1er !");
  else ok(`isolation foyers OK (2e foyer voit ${data?.length ?? 0} tâche(s), pas celles du 1er)`);
}

console.log(process.exitCode ? "\n💥 Des tests ont échoué." : "\n🎉 Tous les tests passent.");
