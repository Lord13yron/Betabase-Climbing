import './manage.css'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canManageGym } from '@/lib/auth/can-manage-gym'
import { ManageClient } from './ManageClient'
import { ArrowLeftIcon, LayersIcon, EyeIcon } from './icons'

export default async function ManageGymPage({
  params,
}: {
  params: Promise<{ gymId: string }>
}) {
  const { gymId } = await params

  if (!(await canManageGym(gymId))) redirect(`/gyms/${gymId}`)

  const supabase = await createClient()
  const [gymResult, wallsResult, routesResult, videoResult] = await Promise.all([
    supabase.from('gyms').select('id, name, city').eq('id', gymId).single(),
    supabase
      .from('walls')
      .select('id, name, sort_order')
      .eq('gym_id', gymId)
      .order('sort_order'),
    supabase
      .from('routes')
      .select('id, name, discipline, color, grade_label, grade_order, wall_id, set_date')
      .eq('gym_id', gymId),
    supabase
      .from('videos')
      .select('route_id, routes!inner(gym_id)')
      .eq('routes.gym_id', gymId)
      .returns<{ route_id: string }[]>(),
  ])

  const gym = gymResult.data
  if (gymResult.error || !gym) notFound()

  const walls = wallsResult.data ?? []
  const routes = routesResult.data ?? []

  // Tally videos per route so each row can show a count chip without loading
  // the clips themselves — the modal fetches those on demand when opened.
  const videoCounts: Record<string, number> = {}
  for (const { route_id } of videoResult.data ?? []) {
    videoCounts[route_id] = (videoCounts[route_id] ?? 0) + 1
  }

  return (
    <main className="m-page">
      <div className="m-wrap">
        <Link href={`/gyms/${gymId}`} className="m-crumb">
          <ArrowLeftIcon />
          Back to {gym.name}
        </Link>

        <div className="m-head">
          <div className="m-head-l">
            <span className="m-eyebrow">Manage gym</span>
            <h1 className="m-title">{gym.name}</h1>
            <div className="m-sub">
              <span className="seg">
                <LayersIcon />
                {routes.length} {routes.length === 1 ? 'route' : 'routes'}
              </span>
              <span className="dot" />
              <span className="seg">
                {walls.length} {walls.length === 1 ? 'wall' : 'walls'}
              </span>
              {gym.city && (
                <>
                  <span className="dot" />
                  <span className="seg">{gym.city}</span>
                </>
              )}
            </div>
          </div>
          <div className="m-head-r">
            <Link href={`/gyms/${gymId}`} className="m-view-link">
              <EyeIcon />
              View public page
            </Link>
          </div>
        </div>

        <div className="m-head-rule" />

        <div className="m-board">
          <ManageClient
            gymId={gymId}
            walls={walls}
            routes={routes}
            videoCounts={videoCounts}
          />
        </div>
      </div>
    </main>
  )
}
