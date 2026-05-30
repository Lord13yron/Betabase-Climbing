-- Step 11 — sends table (route ticks), RLS.
-- Apply by pasting into the Supabase dashboard SQL editor.

create table public.sends (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sent_at timestamptz not null default now(),
  -- One send per user per route; the toggle relies on this for idempotency.
  unique (route_id, user_id)
);

create index sends_user_id_idx on public.sends (user_id);
create index sends_route_id_idx on public.sends (route_id);

alter table public.sends enable row level security;

-- Public read: anyone can see who sent a route.
create policy "Sends are viewable by everyone"
  on public.sends
  for select
  using (true);

-- Any authenticated user may log a send, but only as themselves.
create policy "Authenticated users can insert own sends"
  on public.sends
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- A user can remove only their own send.
create policy "Users can delete own sends"
  on public.sends
  for delete
  using (user_id = auth.uid());
