-- ============================================================================
-- v1 : Sync Realtime sur les tâches.
-- Active la diffusion Realtime (Postgres logical replication) sur `tasks`
-- et `task_assignees` pour que les changements apparaissent en direct côté
-- client sans refresh manuel.
-- Idempotent : peut être rejouée sans erreur.
-- ============================================================================

-- 1) Ajout des tables à la publication Realtime de Supabase.
--    `supabase_realtime` est la publication par défaut écoutée par le service
--    Realtime. On garde l'ajout idempotent via pg_publication_tables.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_assignees'
  ) then
    alter publication supabase_realtime add table public.task_assignees;
  end if;
end $$;

-- 2) REPLICA IDENTITY FULL : sans ça, les événements DELETE ne contiennent
--    que la clé primaire. Le filtre Realtime `project_id=eq.<id>` ne pourrait
--    donc pas matcher une suppression. FULL inclut toutes les colonnes de
--    l'ancienne ligne → les DELETE filtrés sont bien livrés.
alter table public.tasks          replica identity full;
alter table public.task_assignees replica identity full;
