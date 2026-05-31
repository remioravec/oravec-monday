-- ============================================================================
-- Realtime app-wide : étend la diffusion Realtime à la navigation (dossiers,
-- projets) et aux routines, en plus de tasks/task_assignees/profiles déjà
-- couverts. Permet à la sidebar et aux routines de se mettre à jour en direct
-- entre utilisateurs sans refresh. Additive — idempotente.
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array['folders', 'projects', 'routines', 'routine_assignees']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- REPLICA IDENTITY FULL : indispensable pour que les événements DELETE
-- transportent toutes les colonnes (sinon seules les PK sont diffusées).
alter table public.folders           replica identity full;
alter table public.projects          replica identity full;
alter table public.routines          replica identity full;
alter table public.routine_assignees replica identity full;
