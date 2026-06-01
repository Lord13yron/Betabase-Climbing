import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canManageGym } from '@/lib/auth/can-manage-gym'
import { RouteBrowser } from './RouteBrowser'
import { FavoriteHeart } from './FavoriteHeart'
import { ArrowLeftIcon, MapPinIcon, LayersIcon, PlayCircleIcon, SettingsIcon } from './icons'
import './gym-detail.css'

// Stock hero fallback for gyms without their own `image_url`. Mirrors the
// directory's fallback (list, order, and hash in app/gyms/GymCard.tsx) so a gym
// shows the same photo on its card and its hero.
const FALLBACK_IMAGES = [
  '/landing/gym-exterior.png',
  '/landing/climbing-wall-hero.png',
  '/landing/sending-climb.png',
  '/landing/filming-climb.png',
  '/landing/outside-gym.png',
]
function fallbackImage(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return FALLBACK_IMAGES[h % FALLBACK_IMAGES.length]
}

// "Set" label from a date-only column, computed on the server so there's no
// hydration mismatch. Returns the phrase that follows "Set ".
function relativeSetLabel(date: string | null): string | null {
  if (!date) return null
  const then = new Date(`${date}T00:00:00`).getTime()
  if (Number.isNaN(then)) return null
  const days = Math.max(0, Math.floor((Date.now() - then) / 86_400_000))
  if (days === 0) return 'today'
  if (days < 7) return `${days}d ago`
  if (days < 28) return `${Math.floor(days / 7)}w ago`
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default async function GymDetailPage({
  params,
}: {
  params: Promise<{ gymId: string }>
}) {
  const { gymId } = await params
  const supabase = await createClient()

  const [gymResult, wallsResult, routesResult] = await Promise.all([
    supabase
      .from('gyms')
      .select('id, name, city, address, image_url')
      .eq('id', gymId)
      .single(),
    supabase
      .from('walls')
      .select('id, name, sort_order')
      .eq('gym_id', gymId)
      .order('sort_order'),
    supabase
      .from('routes')
      .select('id, name, discipline, color, grade_label, grade_order, wall_id, set_date')
      .eq('gym_id', gymId),
  ])

  const gym = gymResult.data
  if (gymResult.error || !gym) notFound()

  const canManage = await canManageGym(gymId)
  const routes = routesResult.data ?? []
  const walls = wallsResult.data ?? []
  const routeIds = routes.map((r) => r.id)

  // Community counts per route — beta = ready videos (videos have no gym_id, so
  // they're joined through routes), sends = rows in `sends`. Both are folded in
  // memory; the gym's route list is bounded, so this is fine. For a very large
  // gym move these into a Postgres view / RPC (see README → Data notes).
  const betaByRoute = new Map<string, number>()
  const sendsByRoute = new Map<string, number>()
  if (routeIds.length) {
    const [{ data: vids }, { data: sends }] = await Promise.all([
      supabase.from('videos').select('route_id').eq('status', 'ready').in('route_id', routeIds),
      supabase.from('sends').select('route_id').in('route_id', routeIds),
    ])
    for (const v of vids ?? []) betaByRoute.set(v.route_id, (betaByRoute.get(v.route_id) ?? 0) + 1)
    for (const s of sends ?? []) sendsByRoute.set(s.route_id, (sendsByRoute.get(s.route_id) ?? 0) + 1)
  }
  const betaTotal = [...betaByRoute.values()].reduce((a, b) => a + b, 0)

  // Favorites are private, so they only load for the signed-in user, scoped to
  // this gym's routes to keep the lookup cheap.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let gymFavorited = false
  let favoritedRouteIds: string[] = []
  if (user) {
    const [{ data: favGym }, { data: favRoutes }] = await Promise.all([
      supabase
        .from('favorite_gyms')
        .select('gym_id')
        .eq('gym_id', gymId)
        .eq('user_id', user.id)
        .maybeSingle(),
      routeIds.length
        ? supabase
            .from('favorite_routes')
            .select('route_id')
            .eq('user_id', user.id)
            .in('route_id', routeIds)
        : Promise.resolve({ data: [] as { route_id: string }[] }),
    ])
    gymFavorited = !!favGym
    favoritedRouteIds = (favRoutes ?? []).map((f) => f.route_id)
  }

  // Enrich routes with the counts + a display-ready "set" label.
  const browserRoutes = routes.map((r) => ({
    ...r,
    beta: betaByRoute.get(r.id) ?? 0,
    sends: sendsByRoute.get(r.id) ?? 0,
    setLabel: relativeSetLabel(r.set_date),
  }))

  const heroImage = gym.image_url ?? fallbackImage(gym.id)

  return (
    <main className="gd-page">
      <div className="gd-wrap">
        <Link className="gd-crumb" href="/gyms">
          <ArrowLeftIcon />
          All gyms
        </Link>

        {/* Photo hero. Uses the gym's own image_url when set, else a
            deterministic stock fallback matching the directory card. */}
        <section className="gd-hero">
          <div className="gd-hero-img" style={{ backgroundImage: `url('${heroImage}')` }} />
          <div className="gd-hero-scrim" />
          <div className="gd-hero-body">
            <div className="gd-hero-top">
              {gym.city && <span className="gd-eyebrow">{gym.city}</span>}
              <div className="gd-actions">
                {canManage && (
                  <Link className="gd-manage" href={`/gyms/${gymId}/manage`}>
                    <SettingsIcon />
                    Manage
                  </Link>
                )}
                {user && <FavoriteHeart kind="gym" id={gym.id} favorited={gymFavorited} variant="hero" />}
              </div>
            </div>

            <h1 className="gd-hero-name">{gym.name}</h1>

            {(gym.address || gym.city) && (
              <div className="gd-hero-loc">
                <MapPinIcon />
                {gym.address && <span>{gym.address}</span>}
                {gym.address && gym.city && <span className="dot" />}
                {gym.city && <span>{gym.city}</span>}
              </div>
            )}

            <div className="gd-stats">
              <div className="gd-stat">
                <span className="gd-stat-num">
                  <LayersIcon />
                  {routes.length}
                </span>
                <span className="gd-stat-lbl">Routes</span>
              </div>
              <div className="gd-stat">
                <span className="gd-stat-num">{walls.length}</span>
                <span className="gd-stat-lbl">Walls</span>
              </div>
              <div className="gd-stat">
                <span className="gd-stat-num">
                  <PlayCircleIcon />
                  {betaTotal}
                </span>
                <span className="gd-stat-lbl">Beta clips</span>
              </div>
            </div>
          </div>
        </section>

        <RouteBrowser
          routes={browserRoutes}
          walls={walls}
          favoritedRouteIds={favoritedRouteIds}
          canFavorite={!!user}
          canManage={canManage}
          gymId={gymId}
        />
      </div>
    </main>
  )
}
