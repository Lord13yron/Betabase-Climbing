import './route-detail.css'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canManageGym } from '@/lib/auth/can-manage-gym'
import { type Discipline } from '@/lib/grades'
import { holdColor, holdInk } from '@/lib/holds'
import { type Comment } from '@/lib/comments'
import { RouteActions, RouteActionsSignedOut } from './RouteActions'
import { RouteTheater, type TheaterVideo } from './RouteTheater'
import { RouteComments } from './RouteComments'
import { SendersStrip } from './SendersStrip'
import { ArrowLeftIcon } from './icons'

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

type VideoRow = {
  id: string
  status: 'pending' | 'ready' | 'errored'
  mux_playback_id: string | null
  caption: string | null
  uploader_id: string
  created_at: string
  view_count: number
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

  // Videos — extended with created_at (was already ordered by it) so the
  // theater can show relative upload times.
  const { data: allVideos } = await supabase
    .from('videos')
    .select('id, status, mux_playback_id, caption, uploader_id, created_at, view_count')
    .eq('route_id', routeId)
    .order('created_at', { ascending: false })
    .returns<VideoRow[]>()

  const visible = (allVideos ?? []).filter(
    (v) => v.status === 'ready' || v.uploader_id === user?.id
  )

  const canManage = await canManageGym(route.gym_id)

  // Uploader profiles (incl. height_cm) fetched separately and merged in — avoids
  // a fragile embed FK hint on videos.uploader_id.
  const uploaderIds = [...new Set(visible.map((v) => v.uploader_id))]
  const profileById = new Map<
    string,
    { username: string; avatar_url: string | null; height_cm: number | null }
  >()
  if (uploaderIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, height_cm')
      .in('id', uploaderIds)
      .returns<
        { id: string; username: string; avatar_url: string | null; height_cm: number | null }[]
      >()
    for (const p of profs ?? []) profileById.set(p.id, p)
  }

  const COMMENT_SELECT = 'id, body, created_at, author_id, profiles(username, avatar_url)'

  const { data: routeComments } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('route_id', routeId)
    .order('created_at', { ascending: false })
    .returns<Comment[]>()

  // Per-clip comments, grouped by video for the theater's inline threads (and
  // the count shown on each clip).
  const videoIds = visible.map((v) => v.id)
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

  const theaterVideos: TheaterVideo[] = visible.map((v) => ({
    ...v,
    profiles: profileById.get(v.uploader_id) ?? null,
    comments: commentsByVideo[v.id] ?? [],
  }))

  // Sends — count + capped sender row (9 = 8 shown + 1 to detect overflow).
  const { count: sendCount } = await supabase
    .from('sends')
    .select('id', { count: 'exact', head: true })
    .eq('route_id', routeId)

  const { data: senders } = await supabase
    .from('sends')
    .select('user_id, sent_at, profiles(username, avatar_url)')
    .eq('route_id', routeId)
    .order('sent_at', { ascending: false })
    .returns<SenderRow[]>()

  let sent = false
  let favorited = false
  if (user) {
    const [{ data: mySend }, { data: myFav }] = await Promise.all([
      supabase.from('sends').select('id').eq('route_id', routeId).eq('user_id', user.id).maybeSingle(),
      supabase.from('favorite_routes').select('route_id').eq('route_id', routeId).eq('user_id', user.id).maybeSingle(),
    ])
    sent = !!mySend
    favorited = !!myFav
  }

  const totalSends = sendCount ?? 0
  const wallName = route.walls?.name ?? 'Unassigned'
  const setDate = route.set_date
    ? new Date(route.set_date).toLocaleDateString('en-US', {
        timeZone: 'UTC', month: 'short', day: 'numeric',
      })
    : null

  const bg = holdColor(route.color)
  const ink = holdInk(route.color)

  return (
    <div className="rd-page">
      <main className="rd-main">
        <div className="rd-wrap">
          {route.gyms && (
            <Link href={`/gyms/${route.gym_id}`} className="rd-crumb">
              <ArrowLeftIcon />
              {route.gyms.name}
            </Link>
          )}

          {/* route header */}
          <div className="rd-head">
            <span className="rd-grade" style={{ background: bg }}>
              <span className="g" style={{ color: ink }}>{route.grade_label}</span>
              {route.color && !route.color.startsWith('#') && (
                <span className="col" style={{ color: ink }}>{route.color}</span>
              )}
            </span>
            <div className="rd-head-main">
              {route.gyms && <span className="rd-eyebrow">{route.gyms.name}</span>}
              <h1 className="rd-name">{route.name}</h1>
            </div>
            <div className="rd-meta">
              <span>{DISCIPLINE_LABEL[route.discipline]}</span>
              {route.color && (
                <>
                  <span className="dot" />
                  <span className="sw">
                    <i style={{ background: bg }} />
                    <span className="cap">{route.color}</span>
                  </span>
                </>
              )}
              <span className="dot" />
              <span>{wallName}</span>
              {setDate && (
                <>
                  <span className="dot" />
                  <span>Set {setDate}</span>
                </>
              )}
            </div>
            {user ? (
              <RouteActions routeId={route.id} sent={sent} favorited={favorited} />
            ) : (
              <RouteActionsSignedOut />
            )}
          </div>

          {/* send strip */}
          {totalSends > 0 && (
            <SendersStrip senders={senders ?? []} totalSends={totalSends} />
          )}

          <div className="rd-rule" />

          {/* beta theater */}
          <RouteTheater
            videos={theaterVideos}
            totalBeta={theaterVideos.length}
            currentUserId={user?.id ?? null}
            canManage={canManage}
            routeId={route.id}
          />

          <div className="rd-rule" />

          {/* route discussion */}
          <RouteComments
            comments={routeComments ?? []}
            currentUserId={user?.id ?? null}
            canManage={canManage}
            routeId={route.id}
            target={{ routeId: route.id }}
          />
        </div>
      </main>
    </div>
  )
}
