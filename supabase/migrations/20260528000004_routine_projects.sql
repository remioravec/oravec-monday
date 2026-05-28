-- ============================================================================
-- Routines = projets avec récurrence
-- - projects.is_routine + recurrence_*
-- - tasks.time_of_day (hh:mm pour items d'une routine ou tâche horodatée)
-- - rétro-compat : l'ancienne table 'routines' reste utilisée par le cron
-- ============================================================================

alter table public.projects
  add column if not exists is_routine boolean not null default false,
  add column if not exists recurrence_frequency text
    check (recurrence_frequency in ('daily', 'weekly', 'monthly')),
  add column if not exists recurrence_days_of_week int[],
  add column if not exists recurrence_day_of_month int
    check (recurrence_day_of_month between 1 and 31),
  add column if not exists recurrence_time_of_day time;

alter table public.tasks
  add column if not exists time_of_day time;

create index if not exists projects_is_routine_idx on public.projects (is_routine);
