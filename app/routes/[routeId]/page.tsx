import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canManageGym } from '@/lib/auth/can-manage-gym'
import { type Discipline } from '@/lib/grades'
import { BetaUploader } from '@/components/BetaUploader'
import { VideoGallery, type GalleryVideo } from '@/components/VideoGallery'

const DISCIPLINE_LABEL: Record<Discipline, string> = {
  boulder: 'Boulder',
  top_rope: 'Top rope',
  lead: 'Lead',
}

type RouteDetail = {
  id: string
  name: string
  discipline: Discipline
  color: string | null
  grade_label: string
  set_date: string | null
  gym_id: string
  wall_id: string | null
  gyms: { id: string; name: string } | null
  walls: { name: string } | null
}

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ routeId: string }>
}) {
  const { routeId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('routes')
    .select(
      'id, name, discipline, color, grade_label, set_date, gym_id, wall_id, gyms(id, name), walls(name)'
    )
    .eq('id', routeId)
    .single<RouteDetail>()

  if (error || !data) notFound()
  const route = data

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: allVideos } = await supabase
    .from('videos')
    .select('id, status, mux_playback_id, caption, uploader_id')
    .eq('route_id', routeId)
    .order('created_at', { ascending: false })
    .returns<GalleryVideo[]>()

  // Ready clips are public; pending/errored ones only show to their uploader so
  // others don't see in-flight or failed processing noise.
  const videos = (allVideos ?? []).filter(
    (v) => v.status === 'ready' || v.uploader_id === user?.id
  )
  const canManage = await canManageGym(route.gym_id)

  const wallName = route.walls?.name ?? 'Unassigned'
  const setDate = route.set_date
    ? new Date(route.set_date).toLocaleDateString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      {route.gyms && (
        <Link
          href={`/gyms/${route.gym_id}`}
          className="text-sm text-foreground/70 hover:underline"
        >
          ← {route.gyms.name}
        </Link>
      )}

      <h1 className="mt-2 text-2xl font-semibold">{route.name}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/70">
        <span className="font-medium text-foreground">{route.grade_label}</span>
        <span>{DISCIPLINE_LABEL[route.discipline]}</span>
        {route.color && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full border border-foreground/20"
              style={{ backgroundColor: route.color }}
            />
            {route.color}
          </span>
        )}
        <span>{wallName}</span>
        {setDate && <span>Set {setDate}</span>}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Beta videos</h2>
        <VideoGallery
          videos={videos}
          currentUserId={user?.id ?? null}
          canManage={canManage}
        />
        <div className="mt-4">
          {user ? (
            <BetaUploader routeId={route.id} />
          ) : (
            <Link
              href="/login"
              className="text-sm text-foreground/70 hover:underline"
            >
              Log in to add beta
            </Link>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Comments</h2>
        <p className="mt-2 text-sm text-foreground/70">No comments yet.</p>
      </section>
    </main>
  )
}
