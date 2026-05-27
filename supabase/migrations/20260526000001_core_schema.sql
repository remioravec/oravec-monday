-- FamTask — schéma de base (cf. cahier des charges §5.2)
--
-- Choix de modélisation notables (écarts assumés vs le schéma macro du cahier) :
--   * profiles.user_id → auth.users : chaque profil (parent ET enfant) est lié à
--     un utilisateur Supabase Auth, condition nécessaire pour que la RLS
--     s'appuie sur auth.uid(). Les enfants n'ont pas d'email : leur user Auth est
--     provisionné par une Edge Function lors de la connexion par PIN (tâche #4).
--   * profiles.child_mode : distingue l'enfant lecteur (>=6 ans) de l'enfant
--     non-lecteur "kid" (3-5 ans) — pilote les 3 modes d'interface (§4.2).
--   * Le PIN n'est PAS dans profiles : il vit dans profile_credentials, table sans
--     aucune policy → jamais lisible par le client (règle §5.3 « pin_hash jamais
--     renvoyé »). Seul le service_role (Edge Function) y accède.
--   * projects.members[] → table de jointure project_members (plus propre pour la
--     RLS et le filtrage des projets accessibles aux enfants).
--   * routines.task_template_ids[] → jsonb (templates de tâches inline).

create extension if not exists "pgcrypto";

-- ───────────────────────── households ─────────────────────────
create table households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ───────────────────────── profiles ─────────────────────────
create table profiles (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  user_id       uuid unique references auth.users(id) on delete cascade,
  role          text not null check (role in ('parent', 'child')),
  -- null pour les parents ; 'reader' (>=6 ans) ou 'kid' (3-5 ans) pour les enfants
  child_mode    text check (child_mode in ('reader', 'kid')),
  display_name  text not null,
  avatar        text,                       -- url Storage ou clé de pictogramme
  color         text not null default '#5B7FFF',
  battery_cycle text not null default 'daily' check (battery_cycle in ('daily', 'weekly')),
  created_at    timestamptz not null default now(),
  -- cohérence : un enfant a un child_mode, un parent n'en a pas
  constraint child_mode_consistency check (
    (role = 'child' and child_mode is not null) or
    (role = 'parent' and child_mode is null)
  )
);
create index profiles_household_id_idx on profiles(household_id);

-- PIN des enfants — jamais exposé au client (aucune policy RLS, voir migration RLS)
create table profile_credentials (
  profile_id  uuid primary key references profiles(id) on delete cascade,
  pin_hash    text not null,
  updated_at  timestamptz not null default now()
);

-- ───────────────────────── folders ─────────────────────────
create table folders (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,
  icon          text,
  color         text,
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);
create index folders_household_id_idx on folders(household_id);

-- ───────────────────────── projects ─────────────────────────
create table projects (
  id            uuid primary key default gen_random_uuid(),
  folder_id     uuid not null references folders(id) on delete cascade,
  name          text not null,
  view_default  text not null default 'kanban' check (view_default in ('kanban', 'list', 'calendar')),
  start_at      date,
  end_at        date,
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);
create index projects_folder_id_idx on projects(folder_id);

create table project_members (
  project_id  uuid not null references projects(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  primary key (project_id, profile_id)
);
create index project_members_profile_id_idx on project_members(profile_id);

-- ───────────────────────── tasks ─────────────────────────
create table tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  title        text not null,
  description  text,
  status       text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  priority     text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_at       timestamptz,
  -- coût de batterie 1-50 % (§3.5) ; 0 = non défini
  battery_cost integer not null default 0 check (battery_cost between 0 and 50),
  -- règle de récurrence (quotidienne/hebdo/mensuelle/tous les X jours) — §3.7
  recurrence_rule jsonb,
  pictogram_url   text,
  audio_url       text,
  -- §3.6 : la tâche passe à 'done' quand 100 % des sous-tâches sont cochées
  auto_complete_on_subtasks boolean not null default true,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index tasks_project_id_idx on tasks(project_id);
create index tasks_due_at_idx on tasks(due_at);

create table task_assignees (
  task_id     uuid not null references tasks(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  primary key (task_id, profile_id)
);
create index task_assignees_profile_id_idx on task_assignees(profile_id);

-- ───────────────────────── subtasks ─────────────────────────
create table subtasks (
  id        uuid primary key default gen_random_uuid(),
  task_id   uuid not null references tasks(id) on delete cascade,
  title     text not null,
  done      boolean not null default false,
  position  integer not null default 0
);
create index subtasks_task_id_idx on subtasks(task_id);

-- ───────────────────────── routines ─────────────────────────
create table routines (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references households(id) on delete cascade,
  name              text not null,
  trigger_type      text not null check (trigger_type in ('time', 'manual')),
  trigger_time      time,
  task_template_ids jsonb not null default '[]'::jsonb,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);
create index routines_household_id_idx on routines(household_id);

-- ───────────────────────── automations (v1.5) ─────────────────────────
create table automations (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  trigger_json  jsonb not null,
  action_json   jsonb not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index automations_household_id_idx on automations(household_id);

-- ───────────────────────── notifications ─────────────────────────
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_profile_id_idx on notifications(profile_id);

-- ───────────────────────── battery_snapshots ─────────────────────────
create table battery_snapshots (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  cycle_start  timestamptz not null,
  cycle_end    timestamptz not null,
  used_pct     integer not null,
  created_at   timestamptz not null default now()
);
create index battery_snapshots_profile_id_idx on battery_snapshots(profile_id);
