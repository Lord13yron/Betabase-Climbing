-- Step 12 — favorites (gyms + routes), private RLS.
-- Apply by pasting into the Supabase dashboard SQL editor.

create table public.favorite_gyms (
  user_id uuid not null references public.profiles (id) on delete cascade,
  gym_id  uuid not null references public.gyms (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Composite PK gives one favorite per user per gym; the toggle relies on this.
  primary key (user_id, gym_id)
);

create table public.favorite_routes (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  route_id uuid not null references public.routes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, route_id)
);

create index favorite_gyms_user_idx   on public.favorite_gyms (user_id);
create index favorite_routes_user_idx on public.favorite_routes (user_id);

alter table public.favorite_gyms   enable row level security;
alter table public.favorite_routes enable row level security;

-- Private: unlike sends, favorites are visible only to their owner. Each policy
-- restricts reads and writes to the current user's own rows.
create policy "Users read own favorite gyms"
  on public.favorite_gyms for select using (user_id = auth.uid());
create policy "Users insert own favorite gyms"
  on public.favorite_gyms for insert to authenticated with check (user_id = auth.uid());
create policy "Users delete own favorite gyms"
  on public.favorite_gyms for delete using (user_id = auth.uid());

create policy "Users read own favorite routes"
  on public.favorite_routes for select using (user_id = auth.uid());
create policy "Users insert own favorite routes"
  on public.favorite_routes for insert to authenticated with check (user_id = auth.uid());
create policy "Users delete own favorite routes"
  on public.favorite_routes for delete using (user_id = auth.uid());
