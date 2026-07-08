-- Mobile S3 — aggregate views for the app's gyms directory and route browser
-- (docs/MOBILE_BUILD_PLAN.md). The website computes these in memory inside
-- server components; the app reads them as card-ready rows in one query.
-- Apply by pasting into the Supabase dashboard SQL editor.

-- security_invoker: the querying user's RLS applies to the underlying tables
-- (is_gym_visible on gyms/routes/videos, public-read sends), so the views show
-- exactly what the web pages show without duplicating visibility logic.
-- Counts use scalar subqueries; joining routes × videos × sends in one
-- aggregate would fan out and inflate them.

-- One row per live gym with the aggregates GymCard renders (route count,
-- disciplines present, latest set date, ready-beta count). Hard live-only
-- filter mirrors the web directory's .eq('status', 'live'): the directory
-- lists live gyms only, even for managers/admins.
create view public.gym_directory
with (security_invoker = true)
as
select
  g.id,
  g.name,
  g.city,
  g.image_url,
  (select count(*) from public.routes r where r.gym_id = g.id) as route_count,
  (select coalesce(array_agg(distinct r.discipline), '{}')
     from public.routes r where r.gym_id = g.id) as disciplines,
  (select max(r.set_date) from public.routes r where r.gym_id = g.id) as latest_set_date,
  (select count(*)
     from public.videos v
     join public.routes r on r.id = v.route_id
     where r.gym_id = g.id and v.status = 'ready') as beta_count
from public.gyms g
where g.status = 'live';

-- One row per route with the columns RouteBrowser consumes plus per-route
-- counts. No status filter here: routes RLS already gates by gym visibility,
-- so a manager sees their draft gym's routes like on the web gym page.
-- beta_count is ready videos only, matching the web's count queries.
create view public.gym_routes
with (security_invoker = true)
as
select
  r.id,
  r.gym_id,
  r.name,
  r.discipline,
  r.color,
  r.grade_label,
  r.grade_order,
  r.wall_id,
  r.set_date,
  (select count(*)
     from public.videos v
     where v.route_id = r.id and v.status = 'ready') as beta_count,
  (select count(*) from public.sends s where s.route_id = r.id) as send_count
from public.routes r;

grant select on public.gym_directory, public.gym_routes to anon, authenticated;
