-- FamTask — onboarding : création atomique foyer + profil parent.
--
-- Pourquoi un RPC SECURITY DEFINER plutôt que deux INSERT côté client :
-- au tout premier insert, l'utilisateur n'a pas encore de profil, donc
-- current_household_id() est NULL et les policies RLS l'empêcheraient de relire
-- le foyer fraîchement créé (impossible de récupérer son id). Cette fonction
-- contourne ce problème d'amorçage en une seule transaction.

create or replace function setup_household(
  p_household_name text,
  p_display_name text,
  p_color text default '#5B7FFF'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_household_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from profiles where user_id = v_uid) then
    raise exception 'profile already exists for this user';
  end if;

  insert into households (name)
    values (p_household_name)
    returning id into v_household_id;

  insert into profiles (household_id, user_id, role, display_name, color)
    values (v_household_id, v_uid, 'parent', p_display_name, p_color);

  return v_household_id;
end;
$$;

revoke all on function setup_household(text, text, text) from public, anon;
grant execute on function setup_household(text, text, text) to authenticated;
