'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { deleteVideoAction } from '@/app/routes/[routeId]/actions'
import { holdHex, timeAgo, fmtCount, muxThumb } from './card-utils'
import { VideoIcon, PlayIcon, EyeIcon, MessageIcon, CheckIcon, TrashIcon } from './icons'

export type MyVideoRow = {
  id: string
  status: 'pending' | 'ready' | 'errored'
  mux_playback_id: string | null
  caption: string | null
  view_count: number
  created_at: string
  routes: { id: string; name: string; grade_label: string; color: string | null } | null
}

// Client grid for "Beta you've filmed". Owns the per-card delete control: an
// always-visible trash button overlaid on the thumbnail. Deleting removes the
// card optimistically + toasts, then refreshes so the server-rendered counts
// (stat band + section header) reconcile.
export function MyVideosGrid({
  videos: initialVideos,
  commentCountByVideo,
  avatarUrl,
  initial,
}: {
  videos: MyVideoRow[]
  commentCountByVideo: Record<string, number>
  avatarUrl: string | null
  initial: string
}) {
  const router = useRouter()
  const [videos, setVideos] = useState(initialVideos)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: '', show: false })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200)
  }, [])
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  function onConfirmDelete() {
    if (!confirmId) return
    const id = confirmId
    setConfirmId(null)
    startTransition(async () => {
      const prev = videos
      setVideos((vs) => vs.filter((v) => v.id !== id)) // optimistic removal
      const res = await deleteVideoAction(id)
      if (res?.error) {
        setVideos(prev) // restore on failure
        showToast(res.error)
        return
      }
      showToast('Video deleted')
      router.refresh() // reconcile the server-rendered counts
    })
  }

  return (
    <>
      <div className="pf-grid-3">
        {videos.map((v) => {
          const r = v.routes
          const thumb = muxThumb(v.mux_playback_id)
          const bg = holdHex(r?.color ?? null)
          return (
            <div className="pf-card-wrap" key={v.id}>
              <Link className="pf-card" href={r ? `/routes/${r.id}` : '#'}>
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
                      {avatarUrl ? <img src={avatarUrl} alt="" /> : initial}
                    </span>
                    <span className="pf-card-who"><b>you</b> · {timeAgo(v.created_at)}</span>
                    <span className="pf-card-stats">
                      <span className="pf-card-stat"><EyeIcon />{fmtCount(v.view_count)}</span>
                      <span className="pf-card-stat"><MessageIcon />{commentCountByVideo[v.id] ?? 0}</span>
                    </span>
                  </div>
                </div>
              </Link>
              <button
                type="button"
                className="pf-card-del"
                aria-label="Delete video"
                onClick={() => setConfirmId(v.id)}
              >
                <TrashIcon />
              </button>
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete beta video"
        message="This removes the clip for everyone. This can't be undone."
        pending={pending}
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirmId(null)}
      />

      <div className={`pf-toast${toast.show ? ' show' : ''}`} role="status" aria-live="polite">
        <CheckIcon />
        <span>{toast.msg}</span>
      </div>
    </>
  )
}
