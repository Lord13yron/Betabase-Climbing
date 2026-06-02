import './profile.css'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cmToFtIn } from '@/lib/height'
import { ProfileEdit } from './ProfileEdit'
import {
  FlagIcon, VideoIcon, HeartIcon, EyeIcon, MessageIcon, PlayIcon,
  MountainIcon, RulerIcon, UploadIcon,
} from './icons'

// Named climbing-hold colors → hex (mirrors the brand palette). A route.color
// that's already a hex is used directly; unknown/empty falls back to neutral.
const HOLD: Record<string, string> = {
  red: '#d6453b', orange: '#e5743a', yellow: '#edb23a', green: '#4e9d5b',
  teal: '#2e93ae', blue: '#3e6fb3', purple: '#7e5ca8', pink: '#d85b9a',
  black: '#2a2521', white: '#f2eee6',
}
const LIGHT_HOLDS = new Set(['yellow', 'white', 'orange'])
function holdHex(color: string | null): string {
  if (!color) return '#27303a'
  if (color.startsWith('#')) return color
  return HOLD[color.toLowerCase()] ?? '#27303a'
}
function holdInk(color: string | null): string {
  return color && LIGHT_HOLDS.has(color.toLowerCase()) ? '#2a2521' : '#f6f2ea'
}
// Decorative grade-block colors (NOT a route's hold color — these are the two
// "max grade" trophy chips, kept as fixed accents like the prototype).
const BOULDER_BLOCK = '#7e5ca8' // purple
const ROUTE_BLOCK = '#2e93ae'   // teal

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
  return playbackId ? `https://image.mux.com/${playbackId}/thumbnail.webp?width=640&height=360&fit_mode=smartcrop` : null
}

type Profile = {
  username: string | null
  avatar_url: string | null
  height_cm: number | null
  max_boulder_grade: string | null
  max_route_grade: string | null
  created_at: string
}
type MyVideoRow = {
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
type FavGymRow = { gyms: { id: string; name: string; city: string | null } | null }
type FavRouteRow = {
  routes: { id: string; name: string; grade_label: string; color: string | null; gyms: { name: string } | null } | null
}

// Presentational avatar: uploaded photo, else a gold plywood-grain monogram.
function ProfileAvatar({ src, username, size }: { src: string | null; username: string | null; size: number }) {
  const initial = (username ?? '?').charAt(0).toUpperCase()
  const sz = { ['--sz']: `${size}px` } as CSSProperties
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="pf-photo" src={src} alt="" style={sz} />
  }
  return <span className="pf-mono" style={sz}><span>{initial}</span></span>
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('username, avatar_url, height_cm, max_boulder_grade, max_route_grade, created_at')
    .eq('id', user.id)
    .single<Profile>()

  const profile: Profile = profileRow ?? {
    username: null, avatar_url: null, height_cm: null,
    max_boulder_grade: null, max_route_grade: null, created_at: new Date().toISOString(),
  }

  // My uploaded beta (incl. the new view_count) + per-video comment counts.
  const { data: myVideos } = await supabase
    .from('videos')
    .select('id, status, mux_playback_id, caption, view_count, created_at, routes(id, name, grade_label, color)')
    .eq('uploader_id', user.id)
    .order('created_at', { ascending: false })
    .returns<MyVideoRow[]>()

  const videos = myVideos ?? []
  const commentCountByVideo: Record<string, number> = {}
  if (videos.length > 0) {
    const { data: vc } = await supabase
      .from('comments')
      .select('video_id')
      .in('video_id', videos.map((v) => v.id))
      .returns<{ video_id: string }[]>()
    for (const c of vc ?? []) commentCountByVideo[c.video_id] = (commentCountByVideo[c.video_id] ?? 0) + 1
  }

  // Sends (most recent first) — flat log + most-logged gym.
  const { data: sendRows } = await supabase
    .from('sends')
    .select('sent_at, routes(id, name, grade_label, color, gym_id, gyms(name))')
    .eq('user_id', user.id)
    .order('sent_at', { ascending: false })
    .returns<SendRow[]>()

  const sends = (sendRows ?? []).filter((s) => s.routes !== null)
  const totalSends = sends.length
  const gymTally = new Map<string, number>()
  for (const s of sends) {
    const g = s.routes!.gyms?.name
    if (g) gymTally.set(g, (gymTally.get(g) ?? 0) + 1)
  }
  const topGym = [...gymTally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const distinctGyms = gymTally.size

  // Favorites.
  const [{ data: favGymRows }, { data: favRouteRows }] = await Promise.all([
    supabase.from('favorite_gyms').select('gyms(id, name, city)').eq('user_id', user.id)
      .order('created_at', { ascending: false }).returns<FavGymRow[]>(),
    supabase.from('favorite_routes').select('routes(id, name, grade_label, color, gyms(name))').eq('user_id', user.id)
      .order('created_at', { ascending: false }).returns<FavRouteRow[]>(),
  ])
  const favGyms = (favGymRows ?? []).map((r) => r.gyms).filter((g): g is NonNullable<typeof g> => g !== null)
  const favRoutes = (favRouteRows ?? []).map((r) => r.routes).filter((r): r is NonNullable<typeof r> => r !== null)
  const totalFavs = favGyms.length + favRoutes.length

  const name = profile.username ?? 'Your profile'
  const initial = (profile.username ?? '?').charAt(0).toUpperCase()
  const since = new Date(profile.created_at).getFullYear()
  const ftin = profile.height_cm != null ? (() => { const { ft, in: i } = cmToFtIn(profile.height_cm!); return `${ft}′${i}″` })() : null

  return (
    <div className="pf-page">
      <main className="pf-main">
        <div className="pf-wrap">
          {/* compact hero */}
          <div className="pf-chero">
            <ProfileAvatar src={profile.avatar_url} username={profile.username} size={84} />
            <div className="pf-chero-id">
              <span className="pf-eyebrow">Your profile</span>
              <h1 className="pf-name">{name}</h1>
              <div className="pf-handle-row">
                {profile.username && <span className="at">@{profile.username}</span>}
                {topGym && (
                  <>
                    {profile.username && <span className="dot" />}
                    <span className="ic"><MountainIcon />{topGym}</span>
                  </>
                )}
                {ftin && (
                  <>
                    <span className="dot" />
                    <span className="ic"><RulerIcon />{ftin}</span>
                  </>
                )}
                <span className="dot" />
                <span>Climbing since {since}</span>
              </div>
            </div>
            <div className="pf-chero-actions">
              <ProfileEdit
                userId={user.id}
                profile={{
                  username: profile.username,
                  avatar_url: profile.avatar_url,
                  height_cm: profile.height_cm,
                  max_boulder_grade: profile.max_boulder_grade,
                  max_route_grade: profile.max_route_grade,
                }}
                initial={initial}
              />
            </div>
          </div>

          {/* log stat band */}
          <div className="pf-logband">
            <div className="pf-logstat"><span className="l">Sends</span><span className="n">{totalSends}</span></div>
            <div className="pf-logstat"><span className="l">Beta filmed</span><span className="n">{videos.length}</span></div>
            <div className="pf-logstat" style={{ borderRight: '1px solid var(--hairline)' }}>
              <span className="l">Favorites</span><span className="n">{totalFavs}</span>
            </div>
            <div className="pf-loggrade" style={{ background: profile.max_boulder_grade ? BOULDER_BLOCK : 'var(--color-slate-600)' }}>
              <span className="l" style={{ color: profile.max_boulder_grade ? '#f6f2ea' : 'var(--color-slate-300)' }}>Max boulder</span>
              <span className={'n' + (profile.max_boulder_grade ? '' : ' empty')} style={{ color: profile.max_boulder_grade ? '#f6f2ea' : 'var(--color-slate-400)' }}>
                {profile.max_boulder_grade ?? '—'}
              </span>
            </div>
            <div className="pf-loggrade" style={{ background: profile.max_route_grade ? ROUTE_BLOCK : 'var(--color-slate-600)' }}>
              <span className="l" style={{ color: profile.max_route_grade ? '#f6f2ea' : 'var(--color-slate-300)' }}>Max route</span>
              <span className={'n' + (profile.max_route_grade ? '' : ' empty')} style={{ color: profile.max_route_grade ? '#f6f2ea' : 'var(--color-slate-400)' }}>
                {profile.max_route_grade ?? '—'}
              </span>
            </div>
          </div>

          {/* beta you've filmed */}
          <div className="pf-rule" />
          <section className="pf-sec">
            <div className="pf-sec-head">
              <span className="pf-sec-title">Beta you&rsquo;ve filmed</span>
              <span className="pf-sec-count">{videos.length} {videos.length === 1 ? 'clip' : 'clips'}</span>
              <span className="pf-sec-spacer" />
              <Link className="pf-sec-link" href="/gyms"><UploadIcon />Upload beta</Link>
            </div>
            {videos.length === 0 ? (
              <div className="pf-empty">
                <div className="pf-empty-ic"><VideoIcon /></div>
                <h3>No beta yet</h3>
                <p>You haven&rsquo;t filmed any beta. Find a route you&rsquo;ve sent and show the next climber how it&rsquo;s done.</p>
                <Link className="pf-btn" href="/gyms"><UploadIcon />Find a route</Link>
              </div>
            ) : (
              <div className="pf-grid-3">
                {videos.map((v) => {
                  const r = v.routes
                  const thumb = muxThumb(v.mux_playback_id)
                  const bg = holdHex(r?.color ?? null)
                  return (
                    <Link className="pf-card" href={r ? `/routes/${r.id}` : '#'} key={v.id}>
                      <div className="pf-card-stage">
                        {thumb ? (
                          <div className="pf-card-img" style={{ backgroundImage: `url('${thumb}')` }} />
                        ) : (
                          <div className="pf-card-img" style={{ background: 'linear-gradient(135deg,#1d242c,#27303a)' }} />
                        )}
                        <div className="pf-card-scrim" />
                        {v.status === 'ready' ? (
                          <span className="pf-card-play"><PlayIcon /></span>
                        ) : (
                          <span className="pf-card-status"><VideoIcon />{v.status === 'pending' ? 'Processing' : 'Failed'}</span>
                        )}
                      </div>
                      <div className="pf-card-body">
                        <div className="pf-card-route">
                          <span className="pf-dot" style={{ background: bg, width: 12, height: 12 }} />
                          <span className="nm">{r?.name ?? 'Route'}</span>
                          <span className="gr">{r?.grade_label}</span>
                        </div>
                        <div className="pf-card-cap">{v.caption || 'Your beta for this route.'}</div>
                        <div className="pf-card-foot">
                          <span className="pf-ava">
                            {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : initial}
                          </span>
                          <span className="pf-card-who"><b>you</b> · {timeAgo(v.created_at)}</span>
                          <span className="pf-card-stats">
                            <span className="pf-card-stat"><EyeIcon />{fmtCount(v.view_count)}</span>
                            <span className="pf-card-stat"><MessageIcon />{commentCountByVideo[v.id] ?? 0}</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* send log */}
          <div className="pf-rule" />
          <section className="pf-sec">
            <div className="pf-sec-head">
              <span className="pf-sec-title">Send log</span>
              <span className="pf-sec-count">{totalSends} total{distinctGyms > 0 ? ` · ${distinctGyms} ${distinctGyms === 1 ? 'gym' : 'gyms'}` : ''}</span>
            </div>
            {totalSends === 0 ? (
              <div className="pf-empty">
                <div className="pf-empty-ic"><FlagIcon /></div>
                <h3>No sends logged</h3>
                <p>Log your first send from any route page and it&rsquo;ll show up here.</p>
                <Link className="pf-btn" href="/gyms"><FlagIcon />Browse gyms</Link>
              </div>
            ) : (
              <>
                <div className="pf-loghead">
                  <span></span><span>Route</span><span></span><span>Gym</span><span className="r">When</span>
                </div>
                <div className="pf-logtable">
                  {sends.map((s, i) => {
                    const r = s.routes!
                    return (
                      <Link className="pf-logrow" href={`/routes/${r.id}`} key={`${r.id}-${i}`}>
                        <span className="pf-dot" style={{ background: holdHex(r.color) }} />
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

          {/* favorites */}
          <div className="pf-rule" />
          <section className="pf-sec">
            <div className="pf-sec-head">
              <span className="pf-sec-title">Favorites</span>
              <span className="pf-sec-count">{favGyms.length} gyms · {favRoutes.length} routes</span>
            </div>
            {totalFavs === 0 ? (
              <div className="pf-empty">
                <div className="pf-empty-ic"><HeartIcon /></div>
                <h3>Nothing saved yet</h3>
                <p>Tap the heart on a gym or route to keep it here for quick access.</p>
                <Link className="pf-btn" href="/gyms"><HeartIcon />Find your gym</Link>
              </div>
            ) : (
              <div className="pf-favs">
                <div>
                  <div className="pf-fav-col-head"><span className="t">Gyms</span><span className="n">{favGyms.length}</span></div>
                  <div className="pf-fav-list">
                    {favGyms.map((g) => (
                      <Link className="pf-fav" href={`/gyms/${g.id}`} key={g.id}>
                        <span className="pf-fav-ic"><MountainIcon /></span>
                        <span className="pf-fav-body">
                          <span className="pf-fav-name">{g.name}</span>
                          <span className="pf-fav-meta">
                            {g.city && <span>{g.city}</span>}
                            {topGym === g.name && (<><span className="dot" /><span style={{ color: 'var(--color-plywood-400)' }}>Most logged</span></>)}
                          </span>
                        </span>
                        <span className="pf-fav-heart"><HeartIcon /></span>
                      </Link>
                    ))}
                    {favGyms.length === 0 && <p className="pf-edit-av-hint">No favorite gyms yet.</p>}
                  </div>
                </div>
                <div>
                  <div className="pf-fav-col-head"><span className="t">Routes</span><span className="n">{favRoutes.length}</span></div>
                  <div className="pf-fav-list">
                    {favRoutes.map((r) => (
                      <Link className="pf-fav" href={`/routes/${r.id}`} key={r.id}>
                        <span className="pf-fav-ic" style={{ background: holdHex(r.color), borderColor: 'rgba(255,255,255,0.18)' }}>
                          <span className="gr" style={{ color: holdInk(r.color) }}>{r.grade_label}</span>
                        </span>
                        <span className="pf-fav-body">
                          <span className="pf-fav-name">{r.name}</span>
                          <span className="pf-fav-meta">
                            {r.color && <span className="cap">{r.color}</span>}
                            {r.gyms && (<><span className="dot" /><span>{r.gyms.name}</span></>)}
                          </span>
                        </span>
                        <span className="pf-fav-heart"><HeartIcon /></span>
                      </Link>
                    ))}
                    {favRoutes.length === 0 && <p className="pf-edit-av-hint">No favorite routes yet.</p>}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
