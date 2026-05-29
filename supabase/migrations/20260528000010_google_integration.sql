-- ============================================================================
-- Intégration Google : login OAuth, Drive (pièces jointes), Agenda (sync).
-- Additive — idempotente.
-- ============================================================================

-- ============== Connexion Google par utilisateur ==============
-- Stocke les tokens OAuth. RLS : chaque user ne voit que SA ligne ; le serveur
-- (service_role) bypass la RLS pour rafraîchir/utiliser les tokens.
create table if not exists public.google_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  google_email text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text,
  write_calendar_id text,          -- agenda cible pour l'écriture tâche → event
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_connections enable row level security;

drop policy if exists "google_connections_own" on public.google_connections;
create policy "google_connections_own" on public.google_connections
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============== Agendas Google connectés ==============
create table if not exists public.google_calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  google_calendar_id text not null,
  summary text,
  bg_color text,
  selected boolean not null default true,   -- affiché dans la vue calendrier
  sync_token text,                          -- pour la sync incrémentale
  created_at timestamptz not null default now(),
  unique (user_id, google_calendar_id)
);

create index if not exists google_calendars_user_idx on public.google_calendars (user_id);

alter table public.google_calendars enable row level security;

drop policy if exists "google_calendars_own" on public.google_calendars;
create policy "google_calendars_own" on public.google_calendars
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============== Lien tâche ↔ événement Google ==============
alter table public.tasks
  add column if not exists google_event_id text,
  add column if not exists google_calendar_id text,
  add column if not exists google_synced_at timestamptz;

-- ============== Pièces jointes : support Drive ==============
alter table public.task_attachments
  add column if not exists source text not null default 'storage'
    check (source in ('storage', 'drive')),
  add column if not exists external_url text,
  add column if not exists drive_file_id text;

-- Une pièce jointe Drive n'a pas de storage_path → on rend la colonne nullable.
alter table public.task_attachments alter column storage_path drop not null;
