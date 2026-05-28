-- ============================================================================
-- Pivot 2026-05-28 : FamTask → Monday-clone générique.
-- Wipe complet du schéma public + reconstruction.
-- À jouer tel quel dans le SQL Editor du dashboard Supabase cloud.
-- ============================================================================

-- ========== WIPE FAMTASK ==========
-- Trigger auth → profile (FamTask + Monday-clone partagent ce nom, on drop)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.generate_recurring_tasks() cascade;

-- Tables FamTask (drop cascade pour vues/policies/triggers dépendants)
drop view  if exists public.person_workload cascade;
drop table if exists public.battery_snapshots cascade;
drop table if exists public.notifications     cascade;
drop table if exists public.automations       cascade;
drop table if exists public.routine_assignees cascade;
drop table if exists public.routines          cascade;
drop table if exists public.task_assignees    cascade;
drop table if exists public.subtasks          cascade;
drop table if exists public.tasks             cascade;
drop table if exists public.projects          cascade;
drop table if exists public.folders           cascade;
drop table if exists public.profiles          cascade;
drop table if exists public.households        cascade;

-- Fonctions helper FamTask (cf. CLAUDE.md §8 - migrations 0005/0006)
drop function if exists public.folder_in_my_household(uuid) cascade;
drop function if exists public.can_access_project(uuid)     cascade;
drop function if exists public.is_project_member(uuid)      cascade;
drop function if exists public.my_household_id()            cascade;

-- Cron de génération récurrente (sera recréé plus bas)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('generate-recurring-tasks');
  end if;
exception when others then
  -- pas grave si le job n'existait pas
  null;
end $$;

-- ========== EXTENSIONS ==========
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ========== PROFILS ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  color text default '#6366f1',
  created_at timestamptz default now()
);

-- Auto-création du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill : profils manquants pour les users déjà créés en cloud
insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', u.email)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ========== DOSSIERS ==========
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null default 0,
  created_at timestamptz default now()
);

-- ========== PROJETS ==========
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.folders(id) on delete set null,
  name text not null,
  color text,
  position int not null default 0,
  created_at timestamptz default now()
);

-- ========== TÂCHES (auto-référencées : sous-tâches via parent_task_id) ==========
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  parent_task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'a_faire'
    check (status in ('a_faire','en_cours','fait')),
  due_date timestamptz,
  position int not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_tasks_project on public.tasks(project_id);
create index idx_tasks_parent  on public.tasks(parent_task_id);
create index idx_tasks_status  on public.tasks(status);

-- Trigger updated_at automatique
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ========== ASSIGNATIONS many-to-many ==========
create table public.task_assignees (
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (task_id, user_id)
);
create index idx_task_assignees_user on public.task_assignees(user_id);

-- ========== ROUTINES (templates récurrents) ==========
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text,
  frequency text not null check (frequency in ('daily','weekly','monthly')),
  days_of_week int[],
  day_of_month int,
  time_of_day time default '09:00',
  active boolean default true,
  last_generated_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.routine_assignees (
  routine_id uuid references public.routines(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (routine_id, user_id)
);

-- ========== VUE : charge par personne ==========
create or replace view public.person_workload as
select
  p.id   as user_id,
  p.full_name,
  p.color,
  count(t.id) filter (where t.status = 'a_faire')  as a_faire,
  count(t.id) filter (where t.status = 'en_cours') as en_cours,
  count(t.id) filter (where t.status = 'fait')     as fait,
  count(t.id)                                       as total
from public.profiles p
left join public.task_assignees ta on ta.user_id = p.id
left join public.tasks t          on t.id = ta.task_id
group by p.id, p.full_name, p.color;

-- ========== RLS : authentifié = accès complet (interne, à resserrer plus tard) ==========
alter table public.profiles          enable row level security;
alter table public.folders           enable row level security;
alter table public.projects          enable row level security;
alter table public.tasks             enable row level security;
alter table public.task_assignees    enable row level security;
alter table public.routines          enable row level security;
alter table public.routine_assignees enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','folders','projects','tasks',
                           'task_assignees','routines','routine_assignees']
  loop
    execute format(
      'create policy "auth_all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ========== GÉNÉRATION ROUTINES (pg_cron quotidien) ==========
create or replace function public.generate_recurring_tasks()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  new_task_id uuid;
begin
  for r in
    select * from public.routines
    where active = true
      and (last_generated_date is null or last_generated_date < current_date)
  loop
    if (
      r.frequency = 'daily'
      or (r.frequency = 'weekly'  and extract(dow from current_date)::int = any(r.days_of_week))
      or (r.frequency = 'monthly' and extract(day from current_date)::int = r.day_of_month)
    ) then
      insert into public.tasks (project_id, title, description, status, due_date, created_by)
      values (
        r.project_id,
        r.title,
        r.description,
        'a_faire',
        (current_date + coalesce(r.time_of_day, '09:00'::time)),
        r.created_by
      )
      returning id into new_task_id;

      insert into public.task_assignees (task_id, user_id)
      select new_task_id, user_id from public.routine_assignees where routine_id = r.id;

      update public.routines set last_generated_date = current_date where id = r.id;
    end if;
  end loop;
end;
$$;

-- Exécution chaque jour à 00:00
select cron.schedule(
  'generate-recurring-tasks',
  '0 0 * * *',
  $$select public.generate_recurring_tasks()$$
);
