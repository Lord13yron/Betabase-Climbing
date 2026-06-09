'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import { Avatar } from '@/components/Avatar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { deleteVideoAction } from '@/app/routes/[routeId]/actions'
import { muxThumb, timeAgo, fmtCount } from '@/app/profile/card-utils'
import { listRouteVideosAction, type RouteVideo } from './actions'
import { PlayIcon, EyeIcon, TrashIcon, XIcon, FilmIcon, CheckIcon } from './icons'

const STATUS_LABEL: Record<RouteVideo['status'], string> = {
  pending: 'Processing',
  ready: 'Ready',
  errored: 'Failed',
}

// Per-route video manager for the manage page. Opened from a route row's count
// chip; lazily loads that route's clips, plays them inline, and deletes via the
// shared deleteVideoAction (which re-authorizes + cleans up Mux). onDeleted lets
// the parent decrement the row's chip without a reload.
export function RouteVideosModal({
  gymId,
  route,
  onClose,
  onDeleted,
}: {
  gymId: string
  route: { id: string; name: string }
  onClose: () => void
  onDeleted: (routeId: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [videos, setVideos] = useState<RouteVideo[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [loading, startLoad] = useTransition()
  const [deleting, startDelete] = useTransition()

  // --- toast (lives inside the dialog's top layer so it shows above the modal)
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: '', show: false })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200)
  }, [])
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  // Open as a modal on mount and load the route's clips.
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    let active = true
    startLoad(async () => {
      const res = await listRouteVideosAction(gymId, route.id)
      if (!active) return
      if (res.error) setLoadError(res.error)
      else setVideos(res.videos ?? [])
    })
    return () => { active = false }
  }, [gymId, route.id])

  function close() {
    dialogRef.current?.close()
  }

  function onBackdrop(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) close()
  }

  function onConfirmDelete() {
    if (!confirmId) return
    const id = confirmId
    setConfirmId(null)
    startDelete(async () => {
      const prev = videos
      setVideos((vs) => vs?.filter((v) => v.id !== id) ?? null) // optimistic
      setPlayingId((p) => (p === id ? null : p))
      const res = await deleteVideoAction(id)
      if (res?.error) {
        setVideos(prev) // restore on failure
        showToast(res.error)
        return
      }
      onDeleted(route.id)
      showToast('Video deleted')
    })
  }

  const count = videos?.length ?? 0

  return (
    <dialog ref={dialogRef} onClose={onClose} onClick={onBackdrop} className="m-modal m-vmodal">
      <div className="m-modal-head">
        <div>
          <div className="m-modal-title">{route.name}</div>
          <div className="m-modal-sub">
            {loading ? 'Loading beta…' : `${count} ${count === 1 ? 'clip' : 'clips'}`}
          </div>
        </div>
        <button type="button" className="m-modal-x" aria-label="Close" onClick={close}>
          <XIcon />
        </button>
      </div>

      <div className="m-modal-body">
        {loadError ? (
          <div className="m-error">{loadError}</div>
        ) : loading || videos === null ? (
          <div className="m-vempty">Loading beta…</div>
        ) : count === 0 ? (
          <div className="m-vempty">
            <FilmIcon />
            <p>No beta filmed on this route yet.</p>
          </div>
        ) : (
          <div className="m-vgrid">
            {videos.map((v) => {
              const thumb = muxThumb(v.mux_playback_id)
              const isPlaying = playingId === v.id
              const playable = v.status === 'ready' && !!v.mux_playback_id
              return (
                <div className="m-vcard" key={v.id}>
                  <div className="m-vcard-stage">
                    {isPlaying && playable ? (
                      <MuxPlayer
                        playbackId={v.mux_playback_id!}
                        streamType="on-demand"
                        accentColor="#c79f65"
                        poster={thumb ?? undefined}
                        autoPlay
                      />
                    ) : (
                      <>
                        <div
                          className="m-vcard-img"
                          style={
                            thumb
                              ? { backgroundImage: `url('${thumb}')` }
                              : { background: 'linear-gradient(135deg,#1d242c,#27303a)' }
                          }
                        />
                        {playable ? (
                          <button
                            type="button"
                            className="m-vcard-play"
                            aria-label="Play video"
                            onClick={() => setPlayingId(v.id)}
                          >
                            <PlayIcon />
                          </button>
                        ) : (
                          <span className={`m-vcard-status is-${v.status}`}>
                            <FilmIcon />
                            {STATUS_LABEL[v.status]}
                          </span>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      className="m-vcard-del"
                      aria-label="Delete video"
                      title="Delete video"
                      onClick={() => setConfirmId(v.id)}
                    >
                      <TrashIcon />
                    </button>
                  </div>

                  <div className="m-vcard-body">
                    <Avatar
                      src={v.profiles?.avatar_url ?? null}
                      name={v.profiles?.username ?? null}
                      size={28}
                    />
                    <div className="m-vcard-meta">
                      <div className="m-vcard-who">
                        <b>{v.profiles?.username ?? 'unknown'}</b>
                        <span className="dot" />
                        <span>{timeAgo(v.created_at)}</span>
                      </div>
                      {v.caption && <div className="m-vcard-cap">{v.caption}</div>}
                    </div>
                    <span className="m-vcard-views">
                      <EyeIcon />
                      {fmtCount(v.view_count)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete beta video"
        message="This removes the clip for everyone. This can't be undone."
        pending={deleting}
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirmId(null)}
      />

      <div className={`m-toast${toast.show ? ' show' : ''}`} role="status" aria-live="polite">
        <CheckIcon />
        <span>{toast.msg}</span>
      </div>
    </dialog>
  )
}
