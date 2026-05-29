-- ============================================================================
-- Espaces de travail (workspaces) — fondation multi-tenant.
-- Étape additive et SÛRE : crée les tables + colonnes + un espace par défaut
-- « Oravec » regroupant l'existant, sans modifier la RLS des tables existantes
-- (le resserrement par membership viendra avec l'intégration applicative).
-- ============================================================================

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists workspace_members_user_idx on public.workspace_members (user_id);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists workspace_invites_ws_idx on public.workspace_invites (workspace_id);

-- Rattachement des données existantes à un espace
alter table public.folders  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.projects add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.routines add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
create index if not exists folders_ws_idx  on public.folders (workspace_id);
create index if not exists projects_ws_idx on public.projects (workspace_id);

-- Espace par défaut « Oravec » : tous les profils membres, le plus ancien = admin
do $$
declare ws uuid; admin_id uuid;
begin
  if not exists (select 1 from public.workspaces) then
    select id into admin_id from public.profiles order by created_at asc limit 1;
    insert into public.workspaces (name, created_by) values ('Oravec', admin_id) returning id into ws;
    insert into public.workspace_members (workspace_id, user_id, role)
      select ws, p.id, case when p.id = admin_id then 'admin' else 'member' end from public.profiles p;
    update public.folders  set workspace_id = ws where workspace_id is null;
    update public.projects set workspace_id = ws where workspace_id is null;
    update public.routines set workspace_id = ws where workspace_id is null;
  end if;
end $$;

-- Helper RLS (utilisé par l'intégration applicative à venir)
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(ws uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid() and role = 'admin'
  );
$$;

-- RLS sur les NOUVELLES tables (les tables existantes restent en auth_all pour
-- l'instant — resserrement lors de l'intégration applicative).
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;

drop policy if exists "ws_select" on public.workspaces;
create policy "ws_select" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
drop policy if exists "ws_insert" on public.workspaces;
create policy "ws_insert" on public.workspaces for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists "ws_admin_modify" on public.workspaces;
create policy "ws_admin_modify" on public.workspaces for update to authenticated
  using (public.is_workspace_admin(id)) with check (public.is_workspace_admin(id));
drop policy if exists "ws_admin_delete" on public.workspaces;
create policy "ws_admin_delete" on public.workspaces for delete to authenticated
  using (public.is_workspace_admin(id));

drop policy if exists "wm_select" on public.workspace_members;
create policy "wm_select" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
-- Un user peut s'ajouter lui-même (via invitation) ; les admins gèrent les membres.
drop policy if exists "wm_self_or_admin" on public.workspace_members;
create policy "wm_self_or_admin" on public.workspace_members for all to authenticated
  using (user_id = auth.uid() or public.is_workspace_admin(workspace_id))
  with check (user_id = auth.uid() or public.is_workspace_admin(workspace_id));

-- Invitations : les membres voient, les admins créent/suppriment.
drop policy if exists "wi_member_select" on public.workspace_invites;
create policy "wi_member_select" on public.workspace_invites for select to authenticated
  using (public.is_workspace_member(workspace_id));
drop policy if exists "wi_admin_write" on public.workspace_invites;
create policy "wi_admin_write" on public.workspace_invites for all to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));
