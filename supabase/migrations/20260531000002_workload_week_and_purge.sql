-- ============================================================================
-- Charge (batterie) limitée à la semaine de travail + purge des tâches faites.
--
-- 1) La vue person_workload ne compte plus que les tâches dont l'échéance
--    tombe du LUNDI au VENDREDI de la semaine courante (fuseau Europe/Paris).
--    Les tâches passées, futures ou sans date ne sont pas comptées.
-- 2) Chaque dimanche à 00:00, les tâches « fait » sont supprimées (sauf si
--    elles ont encore des sous-tâches non terminées, pour éviter de supprimer
--    en cascade du travail en cours).
-- Idempotente.
-- ============================================================================

-- 1) Vue charge par personne — bornée à la semaine de travail (lun→ven, Paris).
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
left join public.tasks t
  on t.id = ta.task_id
  and t.due_date is not null
  and (t.due_date at time zone 'Europe/Paris')::date
        >= date_trunc('week', (now() at time zone 'Europe/Paris'))::date
  and (t.due_date at time zone 'Europe/Paris')::date
        <= date_trunc('week', (now() at time zone 'Europe/Paris'))::date + 4
group by p.id, p.full_name, p.color;

-- 2) Purge hebdomadaire des tâches terminées.
create or replace function public.purge_done_tasks()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.tasks t
  where t.status = 'fait'
    -- Ne pas supprimer un parent « fait » s'il reste des sous-tâches en cours
    -- (le on delete cascade emporterait le travail non terminé).
    and not exists (
      select 1 from public.tasks c
      where c.parent_task_id = t.id and c.status <> 'fait'
    );
end;
$$;

-- Dimanche à 00:00 (même convention horaire que generate-recurring-tasks).
select cron.schedule(
  'purge-done-tasks',
  '0 0 * * 0',
  $$select public.purge_done_tasks()$$
);
