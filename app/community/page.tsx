import './community.css'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { holdColor } from '@/lib/holds'
import { Avatar } from '@/components/Avatar'
import { UserSearch } from './UserSearch'
import {
  FEED_LIMIT, mergeFeed, timeAgo,
  type CommentFeedRow, type FeedEvent, type SendFeedRow, type VideoFeedRow,
} from './feed'
import { FlagIcon, MessageIcon, PlayIcon, VideoIcon } from './icons'

// `routes!inner` so `.in('routes.gym_id', …)` filters parent rows (and rows
// with a missing route are dropped either way). RLS hides draft/archived gyms.
const VIDEO_SELECT =
  'id, created_at, caption, mux_playback_id, profiles(username, avatar_url), routes!inner(id, name, color, grade_label, gym_id, gyms(name))'
const SEND_SELECT =
  'id, sent_at, profiles(username, avatar_url), routes!inner(id, name, color, grade_label, gym_id, gyms(name))'
const COMMENT_SELECT =
  'id, created_at, body, profiles(username, avatar_url), routes!inner(id, name, color, grade_label, gym_id, gyms(name))'

const NONE = Promise.resolve({ data: null })

const VERB: Record<FeedEvent['kind'], string> = {
  video: 'shared beta on',
  send: 'sent',
  comment: 'commented on',
}
const KIND_ICON: Record<FeedEvent['kind'], React.ReactNode> = {
  video: <VideoIcon />,
  send: <FlagIcon />,
  comment: <MessageIcon />,
}

export default async function CommunityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let favGymIds: string[] = []
  let favRouteIds: string[] = []
  if (user) {
    const [g, r] = await Promise.all([
      supabase.from('favorite_gyms').select('gym_id').eq('user_id', user.id),
      supabase.from('favorite_routes').select('route_id').eq('user_id', user.id),
    ])
    favGymIds = (g.data ?? []).map((x) => x.gym_id)
    favRouteIds = (r.data ?? []).map((x) => x.route_id)
  }
  const personalized = favGymIds.length > 0 || favRouteIds.length > 0

  const videoQ = () =>
    supabase.from('videos').select(VIDEO_SELECT).eq('status', 'ready')
      .order('created_at', { ascending: false }).limit(FEED_LIMIT)
  const sendQ = () =>
    supabase.from('sends').select(SEND_SELECT)
      .order('sent_at', { ascending: false }).limit(FEED_LIMIT)

  let videoRows: VideoFeedRow[] = []
  let sendRows: SendFeedRow[] = []
  let commentRows: CommentFeedRow[] = []

  if (personalized) {
    // Up to five bounded queries: videos + sends at favorite gyms, plus
    // videos + sends + comments on favorite routes. Overlap is deduped in
    // mergeFeed. 50-row caps keep this cheap at current scale.
    const [gymVideos, gymSends, routeVideos, routeSends, routeComments] = await Promise.all([
      favGymIds.length > 0 ? videoQ().in('routes.gym_id', favGymIds).returns<VideoFeedRow[]>() : NONE,
      favGymIds.length > 0 ? sendQ().in('routes.gym_id', favGymIds).returns<SendFeedRow[]>() : NONE,
      favRouteIds.length > 0 ? videoQ().in('route_id', favRouteIds).returns<VideoFeedRow[]>() : NONE,
      favRouteIds.length > 0 ? sendQ().in('route_id', favRouteIds).returns<SendFeedRow[]>() : NONE,
      favRouteIds.length > 0
        ? supabase.from('comments').select(COMMENT_SELECT).in('route_id', favRouteIds)
            .order('created_at', { ascending: false }).limit(FEED_LIMIT).returns<CommentFeedRow[]>()
        : NONE,
    ])
    videoRows = [...(gymVideos.data ?? []), ...(routeVideos.data ?? [])]
    sendRows = [...(gymSends.data ?? []), ...(routeSends.data ?? [])]
    commentRows = routeComments.data ?? []
  } else {
    // Logged out or no favorites yet: global recent activity across live gyms.
    const [videos, sends] = await Promise.all([
      videoQ().returns<VideoFeedRow[]>(),
      sendQ().returns<SendFeedRow[]>(),
    ])
    videoRows = videos.data ?? []
    sendRows = sends.data ?? []
  }

  const feed = mergeFeed(videoRows, sendRows, commentRows)

  return (
    <div className="cm-root">
      <main className="cm-main">
        <div className="cm-wrap">
          <header className="cm-head">
            <div className="cm-eyebrow">Community</div>
            <h1 className="cm-title">
              Fresh <em>beta</em>, live from the walls
            </h1>
            <p className="cm-sub">
              {personalized
                ? 'New beta videos, sends, and route chatter from your favorite gyms and routes.'
                : 'Recent beta videos and sends from gyms across Betabase.'}
            </p>
          </header>

          <div className="cm-toolbar">
            <UserSearch />
          </div>

          {!user && (
            <div className="cm-banner">
              <p>Log in to build a feed around your favorite gyms and routes.</p>
              <Link href="/login" className="cm-banner-link">Log in</Link>
            </div>
          )}
          {user && !personalized && (
            <div className="cm-banner">
              <p>Favorite a gym or route to personalize this feed.</p>
              <Link href="/gyms" className="cm-banner-link">Browse gyms</Link>
            </div>
          )}

          <section className="cm-sec">
            <div className="cm-sec-head">
              <span className="cm-sec-title">{personalized ? 'Your feed' : 'Recent activity'}</span>
              <span className="cm-sec-count">
                {feed.length} {feed.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {feed.length === 0 ? (
              <div className="cm-empty">
                <div className="cm-empty-ic"><FlagIcon /></div>
                <h3>Nothing here yet</h3>
                <p>
                  {personalized
                    ? 'No recent activity at your favorite gyms or routes. Check back after the next session.'
                    : 'No activity yet. Once climbers start logging sends and sharing beta, it’ll show up here.'}
                </p>
              </div>
            ) : (
              <div className="cm-feed">
                {feed.map((e) => (
                  <article className="cm-row" key={e.key}>
                    <Link href={`/u/${e.actor.username}`} className="cm-row-avatar">
                      <Avatar src={e.actor.avatar_url} name={e.actor.username} size={38} />
                    </Link>
                    <div className="cm-row-body">
                      <p className="cm-row-line">
                        <Link href={`/u/${e.actor.username}`} className="cm-actor">
                          {e.actor.username}
                        </Link>{' '}
                        <span className="cm-verb">{VERB[e.kind]}</span>{' '}
                        <Link href={`/routes/${e.route.id}`} className="cm-route">
                          <span className="cm-dot" style={{ background: holdColor(e.route.color) }} />
                          {e.route.name}
                          <span className="cm-grade">{e.route.grade}</span>
                        </Link>
                        {e.gymName && <span className="cm-gym"> at {e.gymName}</span>}
                      </p>
                      {e.kind === 'comment' && e.body && (
                        <p className="cm-quote">&ldquo;{e.body}&rdquo;</p>
                      )}
                      {e.kind === 'video' && e.body && <p className="cm-cap">{e.body}</p>}
                      <div className="cm-row-meta">
                        <span className="cm-kind">{KIND_ICON[e.kind]}</span>
                        <span className="cm-when">{timeAgo(e.ts)}</span>
                      </div>
                    </div>
                    {e.kind === 'video' && (
                      <Link href={`/routes/${e.route.id}`} className="cm-thumb" aria-label={`Watch beta for ${e.route.name}`}>
                        {e.thumb ? (
                          <span className="cm-thumb-img" style={{ backgroundImage: `url('${e.thumb}')` }} />
                        ) : (
                          <span className="cm-thumb-img cm-thumb-blank" />
                        )}
                        <span className="cm-thumb-play"><PlayIcon /></span>
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
