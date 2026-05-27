-- FamTask — Row Level Security (cf. cahier des charges §5.3)
--
-- Principes :
--   * Tout est cloisonné par household_id (un profil ne voit que son foyer).
--   * Les enfants ne peuvent INSERT ni dans folders/projects/automations.
--   * Les enfants ne peuvent JAMAIS DELETE (règle stricte §5.3).
--   * Un enfant ne peut UPDATE que les tâches où il est assigné.
--   * profile_credentials : RLS activée SANS aucune policy → 100 % inaccessible au
--     client. Seul le service_role (Edge Functions) la lit/écrit (il bypasse la RLS).
--
-- Toutes les policies ciblent le rôle `authenticated`.

-- ───────────────────────── households ─────────────────────────
alter table households enable row level security;

create policy households_select on households for select to authenticated
  using (id = current_household_id());

-- Bootstrap : un utilisateur authentifié crée son foyer puis, juste après, son
-- profil parent (cf. profiles_insert). À durcir via tokens d'invitation plus tard.
create policy households_insert on households for insert to authenticated
  with check (true);

create policy households_update on households for update to authenticated
  using (is_parent() and id = current_household_id());

create policy households_delete on households for delete to authenticated
  using (is_parent() and id = current_household_id());

-- ───────────────────────── profiles ─────────────────────────
alter table profiles enable row level security;

create policy profiles_select on profiles for select to authenticated
  using (household_id = current_household_id());

create policy profiles_insert on profiles for insert to authenticated
  with check (
    -- bootstrap : le fondateur crée son propre profil parent
    user_id = auth.uid()
    -- ou un parent crée les profils (enfants) de son foyer
    or (is_parent() and household_id = current_household_id())
  );

create policy profiles_update on profiles for update to authenticated
  using (
    id = current_profile_id()
    or (is_parent() and household_id = current_household_id())
  )
  with check (household_id = current_household_id());

create policy profiles_delete on profiles for delete to authenticated
  using (is_parent() and household_id = current_household_id());

-- ───────────────────────── profile_credentials ─────────────────────────
-- RLS activée, AUCUNE policy : le client ne peut jamais lire le pin_hash.
alter table profile_credentials enable row level security;

-- ───────────────────────── folders ─────────────────────────
alter table folders enable row level security;

create policy folders_select on folders for select to authenticated
  using (household_id = current_household_id());

create policy folders_insert on folders for insert to authenticated
  with check (is_parent() and household_id = current_household_id());

create policy folders_update on folders for update to authenticated
  using (is_parent() and household_id = current_household_id());

create policy folders_delete on folders for delete to authenticated
  using (is_parent() and household_id = current_household_id());

-- ───────────────────────── projects ─────────────────────────
alter table projects enable row level security;

create policy projects_select on projects for select to authenticated
  using (can_access_project(id));

create policy projects_insert on projects for insert to authenticated
  with check (
    is_parent()
    and exists (
      select 1 from folders f
      where f.id = folder_id and f.household_id = current_household_id()
    )
  );

create policy projects_update on projects for update to authenticated
  using (
    is_parent()
    and exists (
      select 1 from folders f
      where f.id = folder_id and f.household_id = current_household_id()
    )
  );

create policy projects_delete on projects for delete to authenticated
  using (
    is_parent()
    and exists (
      select 1 from folders f
      where f.id = folder_id and f.household_id = current_household_id()
    )
  );

-- ───────────────────────── project_members ─────────────────────────
alter table project_members enable row level security;

create policy project_members_select on project_members for select to authenticated
  using (can_access_project(project_id));

create policy project_members_insert on project_members for insert to authenticated
  with check (is_parent() and can_access_project(project_id));

create policy project_members_delete on project_members for delete to authenticated
  using (is_parent() and can_access_project(project_id));

-- ───────────────────────── tasks ─────────────────────────
alter table tasks enable row level security;

create policy tasks_select on tasks for select to authenticated
  using (can_access_project(project_id));

-- Parent ou enfant membre du projet peut créer une tâche (§2.2).
create policy tasks_insert on tasks for insert to authenticated
  with check (can_access_project(project_id));

-- Parent : toutes les tâches de ses projets. Enfant : seulement celles qui lui
-- sont assignées (§5.3).
create policy tasks_update on tasks for update to authenticated
  using (
    (is_parent() and can_access_project(project_id))
    or is_assigned_to_task(id)
  )
  with check (can_access_project(project_id));

create policy tasks_delete on tasks for delete to authenticated
  using (is_parent() and can_access_project(project_id));

-- ───────────────────────── task_assignees ─────────────────────────
alter table task_assignees enable row level security;

create policy task_assignees_select on task_assignees for select to authenticated
  using (can_access_task(task_id));

-- Parent : assigne qui il veut. Enfant : se l'assigne à lui-même uniquement (§2.2).
create policy task_assignees_insert on task_assignees for insert to authenticated
  with check (
    can_access_task(task_id)
    and (is_parent() or profile_id = current_profile_id())
  );

-- DELETE réservé aux parents : un enfant ne supprime jamais rien (§5.3).
create policy task_assignees_delete on task_assignees for delete to authenticated
  using (is_parent() and can_access_task(task_id));

-- ───────────────────────── subtasks ─────────────────────────
alter table subtasks enable row level security;

create policy subtasks_select on subtasks for select to authenticated
  using (can_access_task(task_id));

create policy subtasks_insert on subtasks for insert to authenticated
  with check (is_parent() and can_access_task(task_id));

-- Un enfant assigné à la tâche parente peut cocher/décocher ses sous-tâches.
create policy subtasks_update on subtasks for update to authenticated
  using (
    (is_parent() and can_access_task(task_id))
    or is_assigned_to_task(task_id)
  )
  with check (can_access_task(task_id));

create policy subtasks_delete on subtasks for delete to authenticated
  using (is_parent() and can_access_task(task_id));

-- ───────────────────────── routines ─────────────────────────
alter table routines enable row level security;

-- Lisible par tout le foyer (les enfants démarrent/suivent les routines).
create policy routines_select on routines for select to authenticated
  using (household_id = current_household_id());

create policy routines_insert on routines for insert to authenticated
  with check (is_parent() and household_id = current_household_id());

create policy routines_update on routines for update to authenticated
  using (is_parent() and household_id = current_household_id());

create policy routines_delete on routines for delete to authenticated
  using (is_parent() and household_id = current_household_id());

-- ───────────────────────── automations (parent uniquement) ─────────────────────────
alter table automations enable row level security;

create policy automations_select on automations for select to authenticated
  using (is_parent() and household_id = current_household_id());

create policy automations_insert on automations for insert to authenticated
  with check (is_parent() and household_id = current_household_id());

create policy automations_update on automations for update to authenticated
  using (is_parent() and household_id = current_household_id());

create policy automations_delete on automations for delete to authenticated
  using (is_parent() and household_id = current_household_id());

-- ───────────────────────── notifications ─────────────────────────
alter table notifications enable row level security;

-- Chacun ne voit et ne marque comme lues que SES notifications. La création est
-- faite côté serveur (service_role / Edge Functions).
create policy notifications_select on notifications for select to authenticated
  using (profile_id = current_profile_id());

create policy notifications_update on notifications for update to authenticated
  using (profile_id = current_profile_id())
  with check (profile_id = current_profile_id());

-- ───────────────────────── battery_snapshots ─────────────────────────
alter table battery_snapshots enable row level security;

-- Son propre historique toujours ; celui des autres seulement si parent ou enfant
-- lecteur (l'enfant non-lecteur ne voit pas les batteries d'autrui — §2.2).
-- Écriture réservée au serveur (calcul des cycles).
create policy battery_snapshots_select on battery_snapshots for select to authenticated
  using (
    profile_id = current_profile_id()
    or (
      (is_parent() or current_child_is_reader())
      and exists (
        select 1 from profiles pr
        where pr.id = profile_id and pr.household_id = current_household_id()
      )
    )
  );
