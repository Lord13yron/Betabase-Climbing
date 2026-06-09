-- Step — enforce gyms.status in RLS. Draft/archived gyms (and their walls,
-- routes, videos) were filtered only in page queries; anyone with the anon key
-- could read them via the API. Visible = live, or the caller is an admin or
-- that gym's manager.
-- Apply by pasting into the Supabase dashboard SQL editor.

-- Reusable visibility check for RLS. Mirrors public.is_admin(): SECURITY
-- DEFINER reads gyms bypassing RLS (set search_path = '').
create function public.is_gym_visible(p_gym_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.gyms g
    where g.id = p_gym_id
      and (g.status = 'live' or public.is_admin() or public.is_gym_manager(g.id))
  );
$$;

drop policy "Gyms are viewable by everyone" on public.gyms;
create policy "Live gyms are viewable by everyone"
  on public.gyms
  for select
  using (status = 'live' or public.is_admin() or public.is_gym_manager(id));

drop policy "Walls are viewable by everyone" on public.walls;
create policy "Walls of visible gyms are viewable by everyone"
  on public.walls
  for select
  using (public.is_gym_visible(gym_id));

drop policy "Routes are viewable by everyone" on public.routes;
create policy "Routes of visible gyms are viewable by everyone"
  on public.routes
  for select
  using (public.is_gym_visible(gym_id));

drop policy "Videos are viewable by everyone" on public.videos;
create policy "Videos of visible gyms are viewable by everyone"
  on public.videos
  for select
  using (
    exists (
      select 1 from public.routes r
      where r.id = route_id and public.is_gym_visible(r.gym_id)
    )
  );
