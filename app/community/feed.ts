// Feed normalization for /community. Raw rows from videos/sends/comments are
// mapped into one FeedEvent shape, deduped (a row can match both a favorite
// gym and a favorite route), merged newest-first with newly added routes
// (grouped per gym per day).

export const FEED_LIMIT = 50

type Actor = { username: string; avatar_url: string | null }
type RouteEmbed = {
  id: string
  name: string
  color: string | null
  grade_label: string
  gyms: { name: string } | null
}

export type VideoFeedRow = {
  id: string
  created_at: string
  caption: string | null
  mux_playback_id: string | null
  profiles: Actor | null
  routes: RouteEmbed | null
}
export type SendFeedRow = {
  id: string
  sent_at: string
  profiles: Actor | null
  routes: RouteEmbed | null
}
export type CommentFeedRow = {
  id: string
  created_at: string
  body: string
  profiles: Actor | null
  routes: RouteEmbed | null
}
export type NewRouteRow = {
  id: string
  name: string
  color: string | null
  grade_label: string
  created_at: string
  gym_id: string
  gyms: { name: string; image_url: string | null } | null
}

export type ActivityEvent = {
  kind: 'video' | 'send' | 'comment'
  key: string
  ts: string
  actor: Actor
  route: { id: string; name: string; color: string | null; grade: string }
  gymName: string | null
  thumb: string | null
  body: string | null
}

// Routes added at one gym on one UTC day, collapsed into a single feed item
// so a wall reset doesn't flood the feed.
export type RoutesAddedEvent = {
  kind: 'routes'
  key: string // routes:<gym_id>:<YYYY-MM-DD>
  ts: string // newest created_at in the group
  gym: { id: string; name: string; image_url: string | null }
  routes: { id: string; name: string; color: string | null; grade: string }[] // newest first
}

export type FeedEvent = ActivityEvent | RoutesAddedEvent

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`
  const w = Math.floor(d / 7); if (w < 5) return `${w}w`
  const mo = Math.floor(d / 30); if (mo < 12) return `${mo}mo`
  return `${Math.floor(d / 365)}y`
}

export function muxThumb(playbackId: string | null): string | null {
  return playbackId
    ? `https://image.mux.com/${playbackId}/thumbnail.webp?width=640&height=360&fit_mode=smartcrop`
    : null
}

function toEvent(
  kind: ActivityEvent['kind'],
  id: string,
  ts: string,
  profiles: Actor | null,
  routes: RouteEmbed | null,
  extra: { thumb?: string | null; body?: string | null } = {}
): ActivityEvent | null {
  if (!profiles || !routes) return null
  return {
    kind,
    key: `${kind}:${id}`,
    ts,
    actor: profiles,
    route: { id: routes.id, name: routes.name, color: routes.color, grade: routes.grade_label },
    gymName: routes.gyms?.name ?? null,
    thumb: extra.thumb ?? null,
    body: extra.body ?? null,
  }
}

// Rows arrive newest-first (query orders created_at desc), so the first row in
// a group carries the group's ts and routes stay newest-first.
function groupNewRoutes(rows: NewRouteRow[]): RoutesAddedEvent[] {
  const byKey = new Map<string, RoutesAddedEvent>()
  for (const r of rows) {
    if (!r.gyms) continue
    const key = `routes:${r.gym_id}:${r.created_at.slice(0, 10)}`
    const route = { id: r.id, name: r.name, color: r.color, grade: r.grade_label }
    const group = byKey.get(key)
    if (group) {
      group.routes.push(route)
    } else {
      byKey.set(key, {
        kind: 'routes',
        key,
        ts: r.created_at,
        gym: { id: r.gym_id, name: r.gyms.name, image_url: r.gyms.image_url },
        routes: [route],
      })
    }
  }
  return [...byKey.values()]
}

export function mergeFeed(
  videos: VideoFeedRow[],
  sends: SendFeedRow[],
  comments: CommentFeedRow[],
  newRoutes: NewRouteRow[] = []
): FeedEvent[] {
  const byKey = new Map<string, FeedEvent>()
  const add = (e: FeedEvent | null) => {
    if (e && !byKey.has(e.key)) byKey.set(e.key, e)
  }
  for (const v of videos) {
    add(toEvent('video', v.id, v.created_at, v.profiles, v.routes, {
      thumb: muxThumb(v.mux_playback_id),
      body: v.caption,
    }))
  }
  for (const s of sends) add(toEvent('send', s.id, s.sent_at, s.profiles, s.routes))
  for (const c of comments) {
    add(toEvent('comment', c.id, c.created_at, c.profiles, c.routes, { body: c.body }))
  }
  for (const g of groupNewRoutes(newRoutes)) add(g)
  return [...byKey.values()]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, FEED_LIMIT)
}
