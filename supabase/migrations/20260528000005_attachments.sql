-- ============================================================================
-- Pièces jointes sur tâches
-- - bucket Storage 'attachments' (privé, accessible aux auth)
-- - table public.task_attachments (link tasks <-> object storage path)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists "attachments_auth_read" on storage.objects;
create policy "attachments_auth_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments');

drop policy if exists "attachments_auth_write" on storage.objects;
create policy "attachments_auth_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments');

drop policy if exists "attachments_owner_delete" on storage.objects;
create policy "attachments_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and owner = auth.uid()
  );

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size bigint,
  mime_type text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists task_attachments_task_idx on public.task_attachments (task_id);

alter table public.task_attachments enable row level security;

drop policy if exists "attachments_auth_all" on public.task_attachments;
create policy "attachments_auth_all" on public.task_attachments
  for all to authenticated using (true) with check (true);
