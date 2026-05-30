import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type FavoriteGymRow = {
  gyms: { id: string; name: string; city: string | null } | null
}

type FavoriteRouteRow = {
  routes: {
    id: string
    name: string
    grade_label: string
    color: string | null
    gyms: { name: string } | null
  } | null
}

// Renders the signed-in user's private favorites (gyms + routes). RLS restricts
// these tables to the owner, so this is only used on the owner's /profile page.
export async function UserFavorites({ userId }: { userId: string }) {
  const supabase = await createClient()
  const [{ data: gymRows }, { data: routeRows }] = await Promise.all([
    supabase
      .from('favorite_gyms')
      .select('gyms(id, name, city)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .returns<FavoriteGymRow[]>(),
    supabase
      .from('favorite_routes')
      .select('routes(id, name, grade_label, color, gyms(name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .returns<FavoriteRouteRow[]>(),
  ])

  const gyms = (gymRows ?? [])
    .map((r) => r.gyms)
    .filter((g): g is NonNullable<typeof g> => g !== null)
  const routes = (routeRows ?? [])
    .map((r) => r.routes)
    .filter((r): r is NonNullable<typeof r> => r !== null)

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Favorite gyms ({gyms.length})</h2>
      {gyms.length === 0 ? (
        <p className="mt-2 text-sm text-foreground/70">No favorite gyms yet.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {gyms.map((g) => (
            <li key={g.id}>
              <Link
                href={`/gyms/${g.id}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <span>{g.name}</span>
                {g.city && <span className="text-foreground/70">{g.city}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 text-lg font-semibold">
        Favorite routes ({routes.length})
      </h2>
      {routes.length === 0 ? (
        <p className="mt-2 text-sm text-foreground/70">No favorite routes yet.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {routes.map((r) => (
            <li key={r.id}>
              <Link
                href={`/routes/${r.id}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                {r.color && (
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-foreground/20"
                    style={{ backgroundColor: r.color }}
                  />
                )}
                <span>{r.name}</span>
                <span className="text-foreground/70">{r.grade_label}</span>
                {r.gyms && (
                  <span className="text-foreground/70">· {r.gyms.name}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
