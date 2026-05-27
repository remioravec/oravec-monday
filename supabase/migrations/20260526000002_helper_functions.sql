-- FamTask — fonctions helper pour la RLS
--
-- Toutes en SECURITY DEFINER : elles interrogent `profiles` (et tables liées)
-- en contournant la RLS, ce qui évite la récursion infinie qui surviendrait si
-- une policy sur `profiles` interrogeait `profiles`. search_path figé pour la
-- sécurité.

-- Profil courant (lié à l'utilisateur Auth connecté).
create or replace function current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from profiles where user_id = auth.uid();
$$;

-- Foyer du profil courant.
create or replace function current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select household_id from profiles where user_id = auth.uid();
$$;

-- L'utilisateur courant est-il un parent ?
create or replace function is_parent()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from profiles where user_id = auth.uid() and role = 'parent'
  );
$$;

-- L'utilisateur courant est-il un enfant lecteur (>=6 ans) ?
-- Sert à autoriser la lecture des batteries des autres (§2.2) : enfant lecteur oui,
-- enfant non-lecteur (kid) non.
create or replace function current_child_is_reader()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from profiles
    where user_id = auth.uid() and role = 'child' and child_mode = 'reader'
  );
$$;

-- Le profil courant peut-il accéder à ce projet ?
-- Parent : tous les projets de son foyer. Enfant : uniquement ceux dont il est
-- membre (§3.4 — filtre des projets accessibles aux enfants).
create or replace function can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from projects p
    join folders f on f.id = p.folder_id
    where p.id = p_project_id
      and f.household_id = current_household_id()
      and (
        is_parent()
        or exists (
          select 1 from project_members pm
          where pm.project_id = p.id
            and pm.profile_id = current_profile_id()
        )
      )
  );
$$;

-- Idem mais à partir d'une tâche.
create or replace function can_access_task(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from tasks t
    where t.id = p_task_id and can_access_project(t.project_id)
  );
$$;

-- Le profil courant est-il assigné à cette tâche ? (§5.3 : un enfant ne peut
-- UPDATE que les tâches où il figure dans task_assignees.)
create or replace function is_assigned_to_task(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from task_assignees ta
    where ta.task_id = p_task_id
      and ta.profile_id = current_profile_id()
  );
$$;
