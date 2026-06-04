import './profile.css'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cmToFtIn } from '@/lib/height'
import { ProfileEdit } from './ProfileEdit'
import { MyVideosGrid, type MyVideoRow } from './MyVideosGrid'
import { holdHex, holdInk, timeAgo } from './card-utils'
import {
  FlagIcon, VideoIcon, HeartIcon,
  MountainIcon, RulerIcon, UploadIcon,
} from './icons'

// Decorative grade-block colors (NOT a route's hold color — these are the two
// "max grade" trophy chips, kept as fixed accents like the prototype).
const BOULDER_BLOCK = '#7e5ca8' // purple
const ROUTE_BLOCK = '#2e93ae'   // teal

type Profile = {
  username: string | null
  avatar_url: string | null
  height_cm: number | null
  max_boulder_grade: string | null
  max_route_grade: string | null
  created_at: string
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
            <span className="pf-eyebrow">Your profile</span>
            <h1 className="pf-name">{name}</h1>
            <div className="pf-handle-row">
              {topGym && <span className="ic"><MountainIcon />{topGym}</span>}
              {ftin && (
                <>
                  {topGym && <span className="dot" />}
                  <span className="ic"><RulerIcon />{ftin}</span>
                </>
              )}
              {(topGym || ftin) && <span className="dot" />}
              <span>Climbing since {since}</span>
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
            <div className="pf-logstat">
              <div className="pf-logstat-top"><span className="l">Sends</span><FlagIcon /></div>
              <span className="n">{totalSends}</span>
            </div>
            <div className="pf-logstat">
              <div className="pf-logstat-top"><span className="l">Beta filmed</span><VideoIcon /></div>
              <span className="n">{videos.length}</span>
            </div>
            <div className="pf-logstat" style={{ borderRight: '1px solid var(--hairline)' }}>
              <div className="pf-logstat-top"><span className="l">Favorites</span><HeartIcon /></div>
              <span className="n">{totalFavs}</span>
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
              <MyVideosGrid
                videos={videos}
                commentCountByVideo={commentCountByVideo}
                avatarUrl={profile.avatar_url}
                initial={initial}
              />
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
