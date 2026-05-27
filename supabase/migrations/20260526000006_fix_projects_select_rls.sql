-- FamTask — correctif RLS projects_select (suite de 0005).
--
-- Problème résiduel : projects_select = can_access_project(id), qui RE-INTERROGE
-- la table projects pour la ligne donnée. Lors d'un INSERT ... RETURNING (mode
-- representation de PostgREST), la nouvelle ligne vit dans une CTE modifiante et
-- n'est PAS visible au snapshot d'une sous-requête séparée → la policy SELECT la
-- masque → PostgREST renvoie 42501.
--
-- Solution : évaluer la visibilité à partir des colonnes de la ligne elle-même
-- (folder_id, id) sans re-SELECT sur projects. On s'appuie sur folder_in_my_household
-- (déjà SECURITY DEFINER) et un nouveau is_project_member().

create or replace function is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from project_members pm
    where pm.project_id = p_project_id
      and pm.profile_id = current_profile_id()
  );
$$;

drop policy if exists projects_select on projects;

create policy projects_select on projects for select to authenticated
  using (
    folder_in_my_household(folder_id)
    and (is_parent() or is_project_member(id))
  );
