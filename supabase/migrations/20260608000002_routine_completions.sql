-- ============================================================================
-- Routines = objectifs cochables (et NON des tâches comptées dans la batterie).
--
-- 1) Table routine_completions : une routine cochée pour un jour donné. Le
--    lendemain (ou au prochain jour de récurrence), aucune complétion n'existe
--    → l'objectif réapparaît automatiquement.
-- 2) On retire le cron qui générait des tâches à partir des routines : les
--    routines ne créent plus de tâches, donc n'entrent jamais dans la batterie.
-- Idempotente.
-- ============================================================================

create table if not exists public.routine_completions (
  routine_id   uuid not null references public.routines(id) on delete cascade,
  completed_on date not null,
  completed_by uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (routine_id, completed_on)
);

alter table public.routine_completions enable row level security;
drop policy if exists "auth_all" on public.routine_completions;
create policy "auth_all" on public.routine_completions
  for all to authenticated using (true) with check (true);

-- Realtime : coche/décoche reflétée en direct entre utilisateurs.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'routine_completions'
  ) then
    alter publication supabase_realtime add table public.routine_completions;
  end if;
end $$;
alter table public.routine_completions replica identity full;

-- Les routines ne génèrent plus de tâches (objectifs cochables, hors batterie).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'generate-recurring-tasks') then
    perform cron.unschedule('generate-recurring-tasks');
  end if;
end $$;
