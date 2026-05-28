-- ============================================================================
-- Rôles + masquage personnel
-- Additive — peut être rejouée sans casser les données existantes.
-- ============================================================================

-- ============== profiles.role ==============
alter table public.profiles
  add column if not exists role text not null default 'member'
  check (role in ('admin', 'member'));

-- Premier compte créé = admin. Tous les suivants = member.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select count(*) = 0 into is_first from public.profiles;
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    case when is_first then 'admin' else 'member' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Re-bind trigger (handle_new_user a été remplacée)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Promeut le premier profil existant en admin si aucun admin n'existe encore.
update public.profiles p
set role = 'admin'
where p.id = (
  select id from public.profiles order by created_at asc limit 1
)
and not exists (select 1 from public.profiles where role = 'admin');

-- ============== hidden_items ==============
create table if not exists public.hidden_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_kind text not null check (item_kind in ('folder', 'project', 'task')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_kind, item_id)
);

create index if not exists hidden_items_user_idx on public.hidden_items (user_id);

alter table public.hidden_items enable row level security;

drop policy if exists "hidden_items_own_select" on public.hidden_items;
create policy "hidden_items_own_select" on public.hidden_items
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "hidden_items_own_modify" on public.hidden_items;
create policy "hidden_items_own_modify" on public.hidden_items
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
