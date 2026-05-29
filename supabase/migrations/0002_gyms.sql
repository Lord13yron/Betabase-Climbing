-- Step 3 — gyms, gym_managers, admin role helper, RLS.
-- Apply by pasting into the Supabase dashboard SQL editor.

create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  address text,
  created_at timestamptz not null default now()
);

-- Join table: which users manage which gyms. Admin-assigned manually via the
-- dashboard (no claim UI in MVP), so this table has no client write policy.
create table public.gym_managers (
  gym_id uuid references public.gyms (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  primary key (gym_id, user_id)
);

-- Reusable admin check for RLS. SECURITY DEFINER reads profiles bypassing RLS,
-- so policies don't depend on profiles' read policy staying public. Mirrors the
-- handle_new_user pattern (set search_path = '').
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

alter table public.gyms enable row level security;

-- Public read: anyone can browse the gym catalog.
create policy "Gyms are viewable by everyone"
  on public.gyms
  for select
  using (true);

-- Writes are admin-only (enforced in the DB, not just the UI).
create policy "Admins can insert gyms"
  on public.gyms
  for insert
  with check (public.is_admin());

create policy "Admins can update gyms"
  on public.gyms
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete gyms"
  on public.gyms
  for delete
  using (public.is_admin());

alter table public.gym_managers enable row level security;

-- Public read: who manages a gym isn't sensitive. No write policy, so rows are
-- only created/removed via the dashboard / service-role.
create policy "Gym managers are viewable by everyone"
  on public.gym_managers
  for select
  using (true);
