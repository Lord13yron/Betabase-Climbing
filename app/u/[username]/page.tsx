import './u-profile.css'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { holdColor } from '@/lib/holds'
import { HeightDisplay } from './HeightDisplay'
import {
  PencilIcon, MountainIcon, RulerIcon, FlagIcon,
  VideoIcon, PlayIcon, EyeIcon, MessageIcon,
} from './icons'

// Decorative max-grade trophy-block colors. These are NOT a route's hold color —
// they're fixed brand accents capping the stat band (boulder = purple, route = teal).
const BOULDER_BLOCK = '#7e5ca8'
const ROUTE_BLOCK = '#2e93ae'

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`
  const w = Math.floor(d / 7); if (w < 5) return `${w}w`
  const mo = Math.floor(d / 30); if (mo < 12) return `${mo}mo`
  return `${Math.floor(d / 365)}y`
}
function fmtCount(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n)
}
function muxThumb(playbackId: string | null): string | null {
  return playbackId
    ? `https://image.mux.com/${playbackId}/thumbnail.webp?width=640&height=360&fit_mode=smartcrop`
    : null
}

type PublicProfile = {
  id: string
  username: string
  avatar_url: string | null
  height_cm: number | null
  max_boulder_grade: string | null
  max_route_grade: string | null
  created_at: string
}
type VideoRow = {
  id: string
  status: 'pending' | 'ready' | 'errored'
  mux_playback_id: string | null
  caption: string | null
  view_count: number
  created_at: string
  routes: { id: string; name: string; grade_label: string; color: string | null } | null
}
type SendRow = {
  sent_at: string
  routes: {
    id: string; name: string; grade_label: string; color: string | null
    gym_id: string; gyms: { name: string } | null
  } | null
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, height_cm, max_boulder_grade, max_route_grade, created_at')
    .eq('username', username)
    .single<PublicProfile>()

  if (!profile) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isSelf = user?.id === profile.id

  // This climber's published beta (ready clips only — pending/errored uploads
  // stay private to the owner's /profile). Public read is allowed by RLS.
  const { data: videoRows } = await supabase
    .from('videos')
    .select('id, status, mux_playback_id, caption, view_count, created_at, routes(id, name, grade_label, color)')
    .eq('uploader_id', profile.id)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .returns<VideoRow[]>()

  const videos = videoRows ?? []
  const commentCountByVideo: Record<string, number> = {}
  if (videos.length > 0) {
    const { data: vc } = await supabase
      .from('comments')
      .select('video_id')
      .in('video_id', videos.map((v) => v.id))
      .returns<{ video_id: string }[]>()
    for (const c of vc ?? []) commentCountByVideo[c.video_id] = (commentCountByVideo[c.video_id] ?? 0) + 1
  }

  // Send log (most recent first) + the gyms it touches.
  const { data: sendRows } = await supabase
    .from('sends')
    .select('sent_at, routes(id, name, grade_label, color, gym_id, gyms(name))')
    .eq('user_id', profile.id)
    .order('sent_at', { ascending: false })
    .returns<SendRow[]>()

  const sends = (sendRows ?? []).filter((s) => s.routes !== null)
  const totalSends = sends.length
  const gymTally = new Map<string, number>()
  for (const s of sends) {
    const g = s.routes!.gyms?.name
    if (g) gymTally.set(g, (gymTally.get(g) ?? 0) + 1)
  }
  const distinctGyms = gymTally.size
  const topGym = [...gymTally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const initial = (profile.username ?? '?').charAt(0).toUpperCase()
  const since = new Date(profile.created_at).getFullYear()
  const sz = { ['--sz']: '84px' } as CSSProperties

  return (
    <div className="u-root">
      <main className="u-main">
        <div className="u-wrap">

          {/* identity hero */}
          <section className="u-chero">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="u-photo" src={profile.avatar_url} alt="" style={sz} />
            ) : (
              <span className="u-mono" style={sz}><span>{initial}</span></span>
            )}
            <span className="u-eyebrow">Climber</span>
            <h1 className="u-name">{profile.username}</h1>
            <div className="u-handle-row">
              {topGym && <span className="ic"><MountainIcon />{topGym}</span>}
              {profile.height_cm != null && (
                <>
                  {topGym && <span className="dot" />}
                  <span className="ic"><RulerIcon /><HeightDisplay cm={profile.height_cm} /></span>
                </>
              )}
              {(topGym || profile.height_cm != null) && <span className="dot" />}
              <span>Climbing since {since}</span>
            </div>
            {isSelf && (
              <div className="u-chero-actions">
                <Link href="/profile" className="u-btn">
                  <PencilIcon />
                  Edit profile
                </Link>
              </div>
            )}
          </section>

          {/* stat band */}
          <section className="u-stats">
            <div className="u-stat">
              <div className="u-stat-top"><span className="l">Sends</span><FlagIcon /></div>
              <span className="n">{totalSends}</span>
            </div>
            <div className="u-stat">
              <div className="u-stat-top"><span className="l">Beta filmed</span><VideoIcon /></div>
              <span className="n">{videos.length}</span>
            </div>
            <div className="u-stat">
              <div className="u-stat-top"><span className="l">Gyms</span><MountainIcon /></div>
              <span className="n">{distinctGyms}</span>
            </div>
            <div
              className={'u-grade' + (profile.max_boulder_grade ? '' : ' is-blank')}
              style={{ background: profile.max_boulder_grade ? BOULDER_BLOCK : 'var(--color-slate-600)' }}
            >
              <span className="l" style={{ color: profile.max_boulder_grade ? '#F6F2EA' : 'var(--color-slate-300)' }}>Max boulder</span>
              <span className="n" style={{ color: profile.max_boulder_grade ? '#F6F2EA' : 'var(--color-slate-400)' }}>
                {profile.max_boulder_grade ?? '—'}
              </span>
            </div>
            <div
              className={'u-grade' + (profile.max_route_grade ? '' : ' is-blank')}
              style={{ background: profile.max_route_grade ? ROUTE_BLOCK : 'var(--color-slate-600)' }}
            >
              <span className="l" style={{ color: profile.max_route_grade ? '#F6F2EA' : 'var(--color-slate-300)' }}>Max route</span>
              <span className="n" style={{ color: profile.max_route_grade ? '#F6F2EA' : 'var(--color-slate-400)' }}>
                {profile.max_route_grade ?? '—'}
              </span>
            </div>
          </section>

          {/* beta filmed */}
          <div className="u-rule" />
          <section className="u-sec">
            <div className="u-sec-head">
              <span className="u-sec-title">Beta filmed</span>
              <span className="u-sec-count">{videos.length} {videos.length === 1 ? 'clip' : 'clips'}</span>
            </div>
            {videos.length === 0 ? (
              <div className="u-empty">
                <div className="u-empty-ic"><VideoIcon /></div>
                <h3>No beta yet</h3>
                <p>
                  {isSelf
                    ? 'You haven’t filmed any beta yet. When you share a clip, it’ll show up here for the rest of the gym to learn from.'
                    : `@${profile.username} hasn’t filmed any beta yet. When they share a clip, it’ll show up here for the rest of the gym to learn from.`}
                </p>
              </div>
            ) : (
              <div className="u-grid">
                {videos.map((v) => {
                  const r = v.routes
                  const thumb = muxThumb(v.mux_playback_id)
                  return (
                    <Link className="u-card" href={r ? `/routes/${r.id}` : '#'} key={v.id}>
                      <div className="u-card-stage">
                        {thumb ? (
                          <div className="u-card-img" style={{ backgroundImage: `url('${thumb}')` }} />
                        ) : (
                          <div className="u-card-img" style={{ background: 'linear-gradient(135deg,#1d242c,#27303a)' }} />
                        )}
                        <div className="u-card-scrim" />
                        <span className="u-card-play"><PlayIcon /></span>
                      </div>
                      <div className="u-card-body">
                        <div className="u-card-route">
                          <span className="u-dot" style={{ background: holdColor(r?.color ?? null) }} />
                          <span className="u-card-name">{r?.name ?? 'Route'}</span>
                          <span className="u-card-grade">{r?.grade_label}</span>
                        </div>
                        <div className="u-card-cap">{v.caption || 'Beta for this route.'}</div>
                        <div className="u-card-foot">
                          <span className="u-card-cm eye"><EyeIcon />{fmtCount(v.view_count)}</span>
                          <span className="u-card-cm"><MessageIcon />{commentCountByVideo[v.id] ?? 0}</span>
                          <span className="u-card-when">{timeAgo(v.created_at)}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* send log */}
          <div className="u-rule" />
          <section className="u-sec">
            <div className="u-sec-head">
              <span className="u-sec-title">Send log</span>
              <span className="u-sec-count">
                {totalSends} {totalSends === 1 ? 'send' : 'sends'}
                {distinctGyms > 0 ? ` · ${distinctGyms} ${distinctGyms === 1 ? 'gym' : 'gyms'}` : ''}
              </span>
            </div>
            {totalSends === 0 ? (
              <div className="u-empty">
                <div className="u-empty-ic"><FlagIcon /></div>
                <h3>No sends logged</h3>
                <p>
                  {isSelf
                    ? 'You haven’t logged any sends yet. Your tick list will appear here.'
                    : `@${profile.username} hasn’t logged any sends yet. Their tick list will appear here.`}
                </p>
              </div>
            ) : (
              <>
                <div className="u-loghead">
                  <span></span><span>Route</span><span className="r">Grade</span>
                  <span className="gymcol">Gym</span><span className="r whcol">When</span>
                </div>
                <div className="u-logtable">
                  {sends.map((s, i) => {
                    const r = s.routes!
                    return (
                      <Link className="u-logrow" href={`/routes/${r.id}`} key={`${r.id}-${i}`}>
                        <span className="u-dot" style={{ background: holdColor(r.color) }} />
                        <span className="nm">{r.name}</span>
                        <span className="gr">{r.grade_label}</span>
                        <span className="gym">{r.gyms?.name ?? 'Unknown gym'}</span>
                        <span className="wh">{timeAgo(s.sent_at)}</span>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
          </section>

        </div>
      </main>
    </div>
  )
}
