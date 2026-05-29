-- Step 2 — profiles table, RLS, signup trigger.
-- Apply by pasting into the Supabase dashboard SQL editor.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  avatar_url text,
  height_cm numeric,
  max_boulder_grade text,
  max_route_grade text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Public read: needed so anyone can view profiles (e.g. on a route's videos).
create policy "Profiles are viewable by everyone"
  on public.profiles
  for select
  using (true);

-- A user may update only their own row.
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Privilege-escalation guard: the self-update policy would otherwise let a user
-- flip their own is_admin. Remove column-level UPDATE on is_admin for clients.
revoke update (is_admin) on public.profiles from anon, authenticated;

-- Create a stub profile row for every new auth user. SECURITY DEFINER bypasses
-- RLS, so no INSERT policy is needed and users never insert profiles directly.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
