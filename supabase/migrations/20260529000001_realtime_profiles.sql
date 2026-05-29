-- ============================================================================
-- Realtime sur profiles : avatars / noms / couleurs à jour en direct entre
-- utilisateurs. Additive — idempotente.
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

alter table public.profiles replica identity full;
