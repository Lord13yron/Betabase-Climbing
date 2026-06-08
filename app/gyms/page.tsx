import './gyms-directory.css'
import { createClient } from '@/lib/supabase/server'
import { GymsDirectory, type GymCardData } from './GymsDirectory'
import type { Discipline } from '@/lib/grades'

// Redesigned /gyms directory — dark "concrete slate" theme, 2-col photo cards,
// a "Your gyms" favorites split, discipline filters + sort, and a no-results
// state. Server component: fetches the gym catalog (optionally name/city
// filtered), then computes per-gym aggregates (route count, disciplines,
// latest set date, and a community-beta video count) and the signed-in user's
// favorites, before handing render off to the client <GymsDirectory>.

const DISCIPLINE_LABEL: Record<Discipline, string> = {
  boulder: 'Bouldering',
  lead: 'Lead',
  top_rope: 'Top-rope',
}
// Stable display order so "Bouldering · Lead · Top-rope" never re-shuffles.
const DISCIPLINE_SORT: Record<Discipline, number> = {
  boulder: 0,
  lead: 1,
  top_rope: 2,
}

// "Set 3 days ago" style label from a date-only column. Computed on the server
// and passed down as a string so there's no hydration mismatch.
function relativeSetLabel(date: string | null): string | null {
  if (!date) return null
  const then = new Date(`${date}T00:00:00`).getTime()
  if (Number.isNaN(then)) return null
  const days = Math.max(0, Math.floor((Date.now() - then) / 86_400_000))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default async function GymsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const supabase = await createClient()

  // 1) The gym catalog (name/city search preserved from the original page).
  // `image_url` may be null per gym — cards fall back to a deterministic stock
  // photo when it is (see GymCard.fallbackImage). Only 'live' gyms are listed
  // publicly; draft/archived gyms are managed from the /admin console.
  let request = supabase
    .from('gyms')
    .select('id, name, city, image_url')
    .eq('status', 'live')
    .order('name')
  if (query) {
    const safe = query.replace(/[,()]/g, ' ')
    request = request.or(`name.ilike.%${safe}%,city.ilike.%${safe}%`)
  }
  const { data: gymsRaw } = await request
  const gyms = gymsRaw ?? []
  const gymIds = gyms.map((g) => g.id)

  // 2) Routes for every listed gym — drives route count, disciplines, and the
  // latest set date. One query, aggregated in memory (the gym list is bounded
  // by the search). For very large catalogs, move this to a SQL view / RPC.
  let routes: {
    id: string
    gym_id: string
    discipline: Discipline
    set_date: string | null
  }[] = []
  if (gymIds.length) {
    const { data } = await supabase
      .from('routes')
      .select('id, gym_id, discipline, set_date')
      .in('gym_id', gymIds)
    routes = (data ?? []) as typeof routes
  }

  // 3) Beta count = ready community videos, joined to gyms through their
  // routes (videos have no gym_id of their own).
  const routeToGym = new Map(routes.map((r) => [r.id, r.gym_id]))
  const betaByGym = new Map<string, number>()
  if (routes.length) {
    const { data: vids } = await supabase
      .from('videos')
      .select('route_id')
      .eq('status', 'ready')
      .in(
        'route_id',
        routes.map((r) => r.id)
      )
    for (const v of vids ?? []) {
      const gid = routeToGym.get(v.route_id)
      if (gid) betaByGym.set(gid, (betaByGym.get(gid) ?? 0) + 1)
    }
  }

  // Fold routes into per-gym aggregates.
  const agg = new Map<
    string,
    { count: number; disciplines: Set<Discipline>; latest: string | null }
  >()
  for (const id of gymIds) {
    agg.set(id, { count: 0, disciplines: new Set(), latest: null })
  }
  for (const r of routes) {
    const a = agg.get(r.gym_id)
    if (!a) continue
    a.count += 1
    a.disciplines.add(r.discipline)
    if (r.set_date && (!a.latest || r.set_date > a.latest)) a.latest = r.set_date
  }

  // 4) Favorites — private, so only loaded for a signed-in user and scoped to
  // the gyms currently shown.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let favoritedGymIds: string[] = []
  if (user && gymIds.length) {
    const { data: favs } = await supabase
      .from('favorite_gyms')
      .select('gym_id')
      .eq('user_id', user.id)
      .in('gym_id', gymIds)
    favoritedGymIds = (favs ?? []).map((f) => f.gym_id)
  }

  const cards: GymCardData[] = gyms.map((g) => {
    const a = agg.get(g.id)!
    const disciplines = [...a.disciplines].sort(
      (x, y) => DISCIPLINE_SORT[x] - DISCIPLINE_SORT[y]
    )
    return {
      id: g.id,
      name: g.name,
      city: g.city,
      image: g.image_url ?? null,
      routesCount: a.count,
      beta: betaByGym.get(g.id) ?? 0,
      disciplines,
      typesLabel: disciplines.map((d) => DISCIPLINE_LABEL[d]).join(' · ') || '—',
      setLabel: relativeSetLabel(a.latest),
      setSort: a.latest ? new Date(`${a.latest}T00:00:00`).getTime() : 0,
    }
  })

  return (
    <GymsDirectory
      gyms={cards}
      favoritedGymIds={favoritedGymIds}
      canFavorite={!!user}
      query={query}
    />
  )
}
