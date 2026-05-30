import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canManageGym } from '@/lib/auth/can-manage-gym'
import { FavoriteToggle } from '@/components/FavoriteToggle'
import { RouteBrowser } from './RouteBrowser'

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
      .select('id, name, city, address')
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

  // Favorites are private, so they only load for the signed-in user. We scope
  // the favorite_routes lookup to this gym's routes to keep it cheap.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let gymFavorited = false
  let favoritedRouteIds: string[] = []
  if (user) {
    const routeIds = routes.map((r) => r.id)
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

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{gym.name}</h1>
            {user && (
              <FavoriteToggle kind="gym" id={gym.id} favorited={gymFavorited} />
            )}
          </div>
          {(gym.city || gym.address) && (
            <p className="mt-1 text-sm text-foreground/70">
              {[gym.address, gym.city].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        {canManage && (
          <Link
            href={`/gyms/${gymId}/manage`}
            className="shrink-0 rounded border border-foreground/20 px-3 py-2 text-sm hover:bg-foreground/5"
          >
            Manage this gym
          </Link>
        )}
      </div>

      <div className="mt-6">
        <RouteBrowser
          routes={routes}
          walls={wallsResult.data ?? []}
          favoritedRouteIds={favoritedRouteIds}
          canFavorite={!!user}
        />
      </div>
    </main>
  )
}
