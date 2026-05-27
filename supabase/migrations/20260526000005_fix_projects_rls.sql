-- FamTask — correctif RLS pour projects.
--
-- Problème : les policies projects_* utilisaient une sous-requête CORRÉLÉE sur le
-- nouvel enregistrement (EXISTS(SELECT FROM folders WHERE f.id = projects.folder_id)).
-- Avec PostgREST en mode `return=representation` (déclenché par .select() après un
-- insert), l'insert est encapsulé dans une CTE et la corrélation `projects.folder_id`
-- ne se lie plus → le WITH CHECK est évalué à false → 42501.
--
-- Solution (best practice Supabase) : déporter la sous-requête dans une fonction
-- SECURITY DEFINER qui reçoit folder_id en ARGUMENT (valeur scalaire, pas de
-- corrélation), comme on le fait déjà avec can_access_project / can_access_task.

create or replace function folder_in_my_household(p_folder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from folders f
    where f.id = p_folder_id and f.household_id = current_household_id()
  );
$$;

drop policy if exists projects_insert on projects;
drop policy if exists projects_update on projects;
drop policy if exists projects_delete on projects;

create policy projects_insert on projects for insert to authenticated
  with check (is_parent() and folder_in_my_household(folder_id));

create policy projects_update on projects for update to authenticated
  using (is_parent() and folder_in_my_household(folder_id));

create policy projects_delete on projects for delete to authenticated
  using (is_parent() and folder_in_my_household(folder_id));
