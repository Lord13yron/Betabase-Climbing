-- Step — contact_messages triage flags + admin read/update/delete RLS so the
-- in-app /admin inbox can read and triage submissions (previously dashboard-only).
-- Apply by pasting into the Supabase dashboard SQL editor.

alter table public.contact_messages
  add column read boolean not null default false,
  add column archived boolean not null default false;

-- Superusers (profiles.is_admin) can read, triage, and delete submissions. The
-- existing insert policy keeps the public contact form working for everyone.
create policy "Admins can read contact messages"
  on public.contact_messages
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can update contact messages"
  on public.contact_messages
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete contact messages"
  on public.contact_messages
  for delete
  to authenticated
  using (public.is_admin());
