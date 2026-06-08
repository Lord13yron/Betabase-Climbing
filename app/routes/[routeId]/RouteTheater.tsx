'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MuxPlayer from '@mux/mux-player-react'
import { Avatar } from '@/components/Avatar'
import { BetaUploader } from '@/components/BetaUploader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatHeight } from '@/lib/height'
import type { Comment } from '@/lib/comments'
import { deleteVideoAction, incrementVideoViewAction } from '@/app/routes/[routeId]/actions'
import { RouteComments } from './RouteComments'
import {
  UploadIcon,
  PlayIcon,
  MessageIcon,
  EyeIcon,
  VideoIcon,
  TrashIcon,
} from './icons'

// Richer than the original GalleryVideo: the port's page.tsx extends the
// `videos` select with the uploader profile + created_at so the theater can
// show who filmed each clip (and how tall they are — useful beta context).
// Each clip also carries its own comments for the inline per-clip thread.
export type TheaterVideo = {
  id: string
  status: 'pending' | 'ready' | 'errored'
  mux_playback_id: string | null
  caption: string | null
  uploader_id: string
  created_at: string
  view_count: number
  profiles: { username: string; avatar_url: string | null; height_cm: number | null } | null
  comments: Comment[]
}

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return `${Math.floor(d / 7)}w`
}

const muxThumb = (id: string | null) =>
  id ? `https://image.mux.com/${id}/thumbnail.webp?width=320&time=2` : undefined

// The chosen direction: a large featured player on the left with a scrollable
// "Up next" beta playlist on the right. Selecting a clip swaps the featured
// player. All clip data, deletion, and uploads use the existing
// actions/components — only the presentation is new.
export function RouteTheater({
  videos,
  totalBeta,
  currentUserId,
  canManage,
  routeId,
}: {
  videos: TheaterVideo[]
  totalBeta: number
  currentUserId: string | null
  canManage: boolean
  routeId: string
}) {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(videos[0]?.id ?? null)
  const [showUploader, setShowUploader] = useState(false)
  const [showThread, setShowThread] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isDeleting, startDelete] = useTransition()
  // Local +1 overlay so a viewer sees their own play reflected this session
  // (the persisted count shows for everyone on the next load).
  const [viewBumps, setViewBumps] = useState<Record<string, number>>({})
  const countedRef = useRef<Set<string>>(new Set())

  const onPlay = (videoId: string) => {
    if (countedRef.current.has(videoId)) return
    countedRef.current.add(videoId)
    setViewBumps((b) => ({ ...b, [videoId]: 1 }))
    void incrementVideoViewAction(videoId)
  }

  // Poll while anything is transcoding so the card flips to a player once the
  // Mux webhook lands (same behavior as the original VideoGallery).
  const hasPending = videos.some((v) => v.status === 'pending')
  useEffect(() => {
    if (!hasPending) return
    const t = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(t)
  }, [hasPending, router])

  const active = useMemo(
    () => videos.find((v) => v.id === activeId) ?? videos[0] ?? null,
    [videos, activeId]
  )

  if (videos.length === 0) {
    return (
      <section className="rd-sec">
        <div className="rd-sec-head">
          <span className="rd-sec-title">Beta</span>
          <span className="rd-sec-count">No clips yet</span>
        </div>
        <div className="rd-empty">
          <div className="rd-empty-ic">
            <VideoIcon />
          </div>
          <h3>No beta yet</h3>
          <p>
            Nobody&rsquo;s filmed this one. Be the first to show how it&rsquo;s done &mdash; your
            clip helps the next climber send.
          </p>
          {currentUserId ? (
            <BetaUploaderShell routeId={routeId} />
          ) : (
            <Link href="/login" className="rd-send-btn">
              <UploadIcon />
              Log in to add beta
            </Link>
          )}
        </div>
      </section>
    )
  }

  const onConfirmDelete = () => {
    if (!confirmId) return
    const id = confirmId
    startDelete(async () => {
      await deleteVideoAction(id)
      setConfirmId(null)
      router.refresh()
    })
  }

  const activeCanDelete =
    !!active && (canManage || active.uploader_id === currentUserId)
  const activeHeight =
    active?.profiles?.height_cm != null
      ? formatHeight(active.profiles.height_cm, 'ftin')
      : null

  return (
    <section className="rd-sec">
      <div className="rd-sec-head">
        <span className="rd-sec-title">Beta</span>
        <span className="rd-sec-count">{totalBeta} clips</span>
        <span className="rd-sec-spacer" />
        {currentUserId && (
          <button
            type="button"
            className="rd-upload-btn"
            onClick={() => setShowUploader((s) => !s)}
          >
            <UploadIcon />
            Upload beta
          </button>
        )}
      </div>

      {showUploader && currentUserId && (
        <div className="rd-uploader">
          <BetaUploader routeId={routeId} onUploaded={() => setShowUploader(false)} />
        </div>
      )}

      <div className="rd-theater">
        {/* featured player */}
        <div className="rd-player">
          <div className="rd-player-stage">
            {active && active.status === 'ready' && active.mux_playback_id ? (
              <MuxPlayer
                playbackId={active.mux_playback_id}
                streamType="on-demand"
                accentColor="#c79f65"
                poster={muxThumb(active.mux_playback_id)}
                onPlay={() => onPlay(active.id)}
              />
            ) : active && active.status === 'errored' ? (
              <div className="rd-player-state err">Processing failed</div>
            ) : (
              <div className="rd-player-state">Processing…</div>
            )}

            {active && active.status === 'ready' && (
              <span className="rd-overlay-views">
                <EyeIcon />
                {active.view_count + (viewBumps[active.id] ?? 0)}
              </span>
            )}
            {active && activeCanDelete && (
              <button
                type="button"
                className="rd-overlay-del"
                aria-label="Delete video"
                title="Delete video"
                onClick={() => setConfirmId(active.id)}
              >
                <TrashIcon />
              </button>
            )}
          </div>

          {active && (
            <div className="rd-player-cap">
              <Avatar
                src={active.profiles?.avatar_url ?? null}
                name={active.profiles?.username ?? null}
                size={40}
              />
              <div className="rd-cap-body">
                <div className="rd-cap-who">
                  {active.profiles ? (
                    <Link href={`/u/${active.profiles.username}`} className="rd-comment-name">
                      <b>{active.profiles.username}</b>
                    </Link>
                  ) : (
                    <b>Unknown</b>
                  )}
                  <span className="rd-cap-sub">
                    {activeHeight && (
                      <>
                        <span className="dot" />
                        <span>{activeHeight} tall</span>
                      </>
                    )}
                    <span className="dot" />
                    <span>{relativeTime(active.created_at)} ago</span>
                  </span>
                </div>
                {active.caption && <p className="rd-cap-txt">{`“${active.caption}”`}</p>}
              </div>
              <div className="rd-cap-stats">
                <button
                  type="button"
                  className="rd-cap-stat"
                  aria-expanded={showThread}
                  onClick={() => setShowThread((s) => !s)}
                >
                  <MessageIcon />
                  {active.comments.length}
                </button>
              </div>
            </div>
          )}

          {active && showThread && (
            <RouteComments
              variant="inline"
              target={{ videoId: active.id }}
              comments={active.comments}
              currentUserId={currentUserId}
              canManage={canManage}
              routeId={routeId}
            />
          )}
        </div>

        {/* playlist */}
        <aside className="rd-playlist">
          <div className="rd-playlist-head">
            <span className="t">Up next</span>
            <span className="n">
              {videos.length} of {totalBeta}
            </span>
          </div>
          <div className="rd-clips">
            {videos.map((v) => (
              <button
                type="button"
                key={v.id}
                className={`rd-clip${v.id === active?.id ? ' is-active' : ''}`}
                onClick={() => {
                  setActiveId(v.id)
                  setShowThread(false)
                }}
              >
                <div
                  className="rd-clip-thumb"
                  style={
                    v.mux_playback_id
                      ? { backgroundImage: `url('${muxThumb(v.mux_playback_id)}')` }
                      : { background: '#07090C' }
                  }
                >
                  {v.id === active?.id && (
                    <span className="rd-clip-play">
                      <PlayIcon />
                    </span>
                  )}
                </div>
                <div className="rd-clip-body">
                  <div className="rd-clip-cap">{v.caption || 'Beta clip'}</div>
                  <div className="rd-clip-meta">
                    <span>{v.profiles?.username ?? 'unknown'}</span>
                    <span className="dot" />
                    <span>{relativeTime(v.created_at)}</span>
                    <span className="dot" />
                    <span className="cm">
                      <EyeIcon />
                      {v.view_count + (viewBumps[v.id] ?? 0)}
                    </span>
                    <span className="dot" />
                    <span className="cm">
                      <MessageIcon />
                      {v.comments.length}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete beta video"
        message="This removes the clip for everyone. This can't be undone."
        pending={isDeleting}
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </section>
  )
}

// Small wrapper so the empty-state CTA can reveal the uploader inline.
function BetaUploaderShell({ routeId }: { routeId: string }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button type="button" className="rd-send-btn" onClick={() => setOpen(true)}>
        <UploadIcon />
        Upload the first beta
      </button>
    )
  }
  return (
    <div className="rd-uploader" style={{ width: '100%', maxWidth: 460 }}>
      <BetaUploader routeId={routeId} onUploaded={() => setOpen(false)} />
    </div>
  )
}
