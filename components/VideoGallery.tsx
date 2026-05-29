'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import MuxPlayer from '@mux/mux-player-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { deleteVideoAction } from '@/app/routes/[routeId]/actions'

export type GalleryVideo = {
  id: string
  status: 'pending' | 'ready' | 'errored'
  mux_playback_id: string | null
  caption: string | null
  uploader_id: string
}

export function VideoGallery({
  videos,
  currentUserId,
  canManage,
}: {
  videos: GalleryVideo[]
  currentUserId: string | null
  canManage: boolean
}) {
  const router = useRouter()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // While anything is transcoding, poll so the card flips to a player once the
  // Mux webhook lands. Stops as soon as nothing is pending.
  const hasPending = videos.some((v) => v.status === 'pending')
  useEffect(() => {
    if (!hasPending) return
    const timer = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(timer)
  }, [hasPending, router])

  if (videos.length === 0) {
    return <p className="mt-2 text-sm text-foreground/70">No beta videos yet.</p>
  }

  const onConfirmDelete = () => {
    if (!confirmId) return
    const id = confirmId
    startTransition(async () => {
      await deleteVideoAction(id)
      setConfirmId(null)
      router.refresh()
    })
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {videos.map((video) => {
        const canDelete = canManage || video.uploader_id === currentUserId
        return (
          <div
            key={video.id}
            className="overflow-hidden rounded-lg border border-foreground/15"
          >
            {video.status === 'ready' && video.mux_playback_id ? (
              <MuxPlayer
                playbackId={video.mux_playback_id}
                streamType="on-demand"
                className="aspect-video w-full bg-black"
              />
            ) : video.status === 'errored' ? (
              <div className="flex aspect-video w-full items-center justify-center bg-foreground/5 text-sm text-red-600">
                Processing failed
              </div>
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-foreground/5 text-sm text-foreground/60">
                Processing…
              </div>
            )}
            <div className="flex items-start justify-between gap-2 p-3">
              <p className="text-sm text-foreground/80">{video.caption}</p>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmId(video.id)}
                  className="shrink-0 text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )
      })}

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete beta video"
        message="This removes the clip for everyone. This can't be undone."
        pending={isPending}
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
