import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canManageGym } from '@/lib/auth/can-manage-gym'
import { type Discipline } from '@/lib/grades'
import { BetaUploader } from '@/components/BetaUploader'
import { VideoGallery, type GalleryVideo } from '@/components/VideoGallery'
import { Avatar } from '@/components/Avatar'
import { SendToggle } from '@/components/SendToggle'
import { FavoriteToggle } from '@/components/FavoriteToggle'
import { CommentThread, type Comment } from '@/components/CommentThread'

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

type SenderRow = {
  user_id: string
  sent_at: string
  profiles: { username: string; avatar_url: string | null } | null
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

  const COMMENT_SELECT = 'id, body, created_at, author_id, profiles(username, avatar_url)'

  const { data: routeComments } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('route_id', routeId)
    .order('created_at', { ascending: false })
    .returns<Comment[]>()

  // Comments for the videos shown on this page, grouped by video for the gallery.
  const videoIds = videos.map((v) => v.id)
  const commentsByVideo: Record<string, Comment[]> = {}
  if (videoIds.length > 0) {
    const { data: videoComments } = await supabase
      .from('comments')
      .select(`${COMMENT_SELECT}, video_id`)
      .in('video_id', videoIds)
      .order('created_at', { ascending: false })
      .returns<(Comment & { video_id: string })[]>()
    for (const c of videoComments ?? []) {
      ;(commentsByVideo[c.video_id] ??= []).push(c)
    }
  }

  // Aggregate count is the source of truth for the number; the capped sender
  // fetch (9 = 8 shown + 1 to detect overflow) is only for the avatar row.
  const { count: sendCount } = await supabase
    .from('sends')
    .select('id', { count: 'exact', head: true })
    .eq('route_id', routeId)

  const { data: senders } = await supabase
    .from('sends')
    .select('user_id, sent_at, profiles(username, avatar_url)')
    .eq('route_id', routeId)
    .order('sent_at', { ascending: false })
    .limit(9)
    .returns<SenderRow[]>()

  let sent = false
  let favorited = false
  if (user) {
    const [{ data: mySend }, { data: myFav }] = await Promise.all([
      supabase
        .from('sends')
        .select('id')
        .eq('route_id', routeId)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('favorite_routes')
        .select('route_id')
        .eq('route_id', routeId)
        .eq('user_id', user.id)
        .maybeSingle(),
    ])
    sent = !!mySend
    favorited = !!myFav
  }

  const totalSends = sendCount ?? 0

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

      <section className="mt-6">
        {user ? (
          <div className="flex items-center gap-3">
            <SendToggle routeId={route.id} sent={sent} />
            <FavoriteToggle kind="route" id={route.id} favorited={favorited} />
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm text-foreground/70 hover:underline"
          >
            Log in to log your send
          </Link>
        )}

        <p className="mt-3 text-sm text-foreground/70">
          {totalSends} {totalSends === 1 ? 'send' : 'sends'}
        </p>

        {senders && senders.length > 0 && (
          <div className="mt-2 flex items-center gap-1">
            {senders.slice(0, 8).map((s) =>
              s.profiles ? (
                <Link key={s.user_id} href={`/u/${s.profiles.username}`}>
                  <Avatar
                    src={s.profiles.avatar_url}
                    name={s.profiles.username}
                    size={32}
                  />
                </Link>
              ) : null
            )}
            {totalSends > 8 && (
              <span className="ml-1 text-sm text-foreground/70">
                +{totalSends - 8} more
              </span>
            )}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Beta videos</h2>
        <VideoGallery
          videos={videos}
          currentUserId={user?.id ?? null}
          canManage={canManage}
          commentsByVideo={commentsByVideo}
          routeId={route.id}
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
        <CommentThread
          comments={routeComments ?? []}
          currentUserId={user?.id ?? null}
          canManage={canManage}
          target={{ routeId: route.id }}
          routeId={route.id}
        />
      </section>
    </main>
  )
}
