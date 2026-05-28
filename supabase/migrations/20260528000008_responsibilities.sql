-- ============================================================================
-- Responsabilités : un user (parent/manager) "couvre" un autre user (enfant)
-- Permet au parent de voir la charge et les routines des enfants dans sa vue
-- d'ensemble.
-- ============================================================================

create table if not exists public.responsibilities (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, child_id),
  check (parent_id <> child_id)
);

create index if not exists responsibilities_parent_idx
  on public.responsibilities (parent_id);
create index if not exists responsibilities_child_idx
  on public.responsibilities (child_id);

alter table public.responsibilities enable row level security;

-- Lecture : tout authentifié peut voir la structure (équipe restreinte, interne)
drop policy if exists "resp_read" on public.responsibilities;
create policy "resp_read" on public.responsibilities
  for select to authenticated using (true);

-- Write : seuls les admins peuvent créer/supprimer des liens
drop policy if exists "resp_admin_write" on public.responsibilities;
create policy "resp_admin_write" on public.responsibilities
  for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
