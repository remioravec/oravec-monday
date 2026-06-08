-- ============================================================================
-- Charge (batterie) : étendre la semaine au LUNDI → DIMANCHE (au lieu de
-- lundi → vendredi). On ne compte que les tâches dont l'échéance tombe dans
-- la semaine courante (fuseau Europe/Paris) ; passées/futures/sans date
-- restent exclues. Idempotente.
-- ============================================================================
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
        <= date_trunc('week', (now() at time zone 'Europe/Paris'))::date + 6
group by p.id, p.full_name, p.color;
