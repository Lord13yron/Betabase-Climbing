-- Step 5 — walls, routes, gym-manager RLS helper, RLS.
-- Apply by pasting into the Supabase dashboard SQL editor.

create table public.walls (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  -- Target of the routes composite FK below, which pins a route's wall to the
  -- route's gym.
  unique (id, gym_id)
);

create index walls_gym_id_sort_order_idx
  on public.walls (gym_id, sort_order);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  wall_id uuid,
  name text not null,
  discipline text not null
    check (discipline in ('boulder', 'top_rope', 'lead')),
  color text,
  grade_label text not null,
  grade_order integer not null,
  set_date date,
  created_at timestamptz not null default now(),
  -- Pin the wall to the same gym as the route, and cascade wall deletes to
  -- routes. With wall_id null the FK isn't enforced (MATCH SIMPLE), so a
  -- wall-less route is allowed while gym_id stays guarded by its own FK above.
  foreign key (wall_id, gym_id)
    references public.walls (id, gym_id) on delete cascade
);

create index routes_gym_id_idx on public.routes (gym_id);
create index routes_wall_id_idx on public.routes (wall_id);

-- Reusable manager check for RLS. Mirrors public.is_admin(): SECURITY DEFINER
-- reads gym_managers bypassing RLS (set search_path = '').
create function public.is_gym_manager(p_gym_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.gym_managers
    where gym_id = p_gym_id and user_id = auth.uid()
  );
$$;

alter table public.walls enable row level security;

-- Public read: anyone can browse a gym's walls.
create policy "Walls are viewable by everyone"
  on public.walls
  for select
  using (true);

-- Writes by that gym's manager or an admin (enforced in the DB, not just UI).
create policy "Managers and admins can insert walls"
  on public.walls
  for insert
  with check (public.is_gym_manager(gym_id) or public.is_admin());

create policy "Managers and admins can update walls"
  on public.walls
  for update
  using (public.is_gym_manager(gym_id) or public.is_admin())
  with check (public.is_gym_manager(gym_id) or public.is_admin());

create policy "Managers and admins can delete walls"
  on public.walls
  for delete
  using (public.is_gym_manager(gym_id) or public.is_admin());

alter table public.routes enable row level security;

-- Public read: anyone can browse a gym's routes.
create policy "Routes are viewable by everyone"
  on public.routes
  for select
  using (true);

-- Writes by that gym's manager or an admin. The with check on update also
-- blocks moving a route into a gym the caller doesn't manage.
create policy "Managers and admins can insert routes"
  on public.routes
  for insert
  with check (public.is_gym_manager(gym_id) or public.is_admin());

create policy "Managers and admins can update routes"
  on public.routes
  for update
  using (public.is_gym_manager(gym_id) or public.is_admin())
  with check (public.is_gym_manager(gym_id) or public.is_admin());

create policy "Managers and admins can delete routes"
  on public.routes
  for delete
  using (public.is_gym_manager(gym_id) or public.is_admin());
