'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import MuxUploader, { type MuxUploaderRefAttributes } from '@mux/mux-uploader-react'
import { UploadIcon, VideoIcon, CheckIcon, XIcon } from './icons'

export type ClipStatus = 'idle' | 'uploading' | 'ready'

// Step 02 clip UI. Renders the prototype's drop-zone → file card and drives a
// headless <MuxUploader> via the same `file-ready` event the official drop
// component dispatches — so the look is fully ours while the upload, progress,
// and success are real Mux. Mirrors BetaUploader's endpoint contract (POST
// /api/mux/upload → direct-upload URL; onSuccess → router.refresh()), minus the
// caption (dropped for this flow; the API coalesces a missing caption to null).
export function ClipUploader({
  routeId,
  onStatusChange,
  onUploaded,
}: {
  routeId: string
  onStatusChange: (status: ClipStatus) => void
  onUploaded?: () => void
}) {
  const router = useRouter()
  const muxRef = useRef<MuxUploaderRefAttributes>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<{ name: string; sizeMB: string } | null>(null)
  const [duration, setDuration] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<ClipStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const getEndpoint = async () => {
    const res = await fetch('/api/mux/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeId, caption }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? 'Failed to start upload.')
    return data.url as string
  }

  function setClipStatus(next: ClipStatus) {
    setStatus(next)
    onStatusChange(next)
  }

  function startUpload(picked: File) {
    if (!picked.type.startsWith('video/')) {
      setError('That file isn’t a video. Try MP4, MOV, or WEBM.')
      return
    }
    setError(null)
    setProgress(0)
    setDuration(null)
    setFile({ name: picked.name, sizeMB: (picked.size / 1_000_000).toFixed(1) })
    setClipStatus('uploading')

    // Real upload: the headless <MuxUploader> starts on `file-ready` (the same
    // event its official drop component dispatches) using our getEndpoint.
    muxRef.current?.dispatchEvent(
      new CustomEvent('file-ready', { composed: true, bubbles: true, detail: picked })
    )

    // Real clip duration for the thumbnail chip (no fabricated metric).
    const url = URL.createObjectURL(picked)
    const probe = document.createElement('video')
    probe.preload = 'metadata'
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration)) {
        const total = Math.round(probe.duration)
        setDuration(`${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`)
      }
      URL.revokeObjectURL(url)
    }
    probe.src = url
  }

  function reset() {
    ;(muxRef.current as unknown as { resetState?: () => void } | null)?.resetState?.()
    setFile(null)
    setDuration(null)
    setProgress(0)
    setError(null)
    setClipStatus('idle')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <>
      {/* Headless real uploader — visually hidden, driven via file-ready. */}
      <MuxUploader
        ref={muxRef}
        className="u-mux-hidden"
        endpoint={getEndpoint}
        onProgress={(e) => setProgress(Math.round((e as CustomEvent).detail as number))}
        onSuccess={() => {
          setProgress(100)
          setClipStatus('ready')
          router.refresh()
          onUploaded?.()
        }}
        onUploadError={(e) => {
          const detail = (e as CustomEvent).detail as { message?: string } | undefined
          setError(detail?.message ?? 'Upload failed. Try again.')
          setClipStatus('idle')
        }}
      />

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          const picked = e.target.files?.[0]
          if (picked) startUpload(picked)
        }}
      />

      <div className="u-caption-field">
        <div className="u-label-row">
          <label className="u-label" htmlFor="u-caption">
            Caption (optional)
          </label>
          <span className="u-count">{caption.length}/280</span>
        </div>
        <textarea
          id="u-caption"
          className="u-textarea"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={280}
          placeholder="Call out the crux, the beta, the foot you stand up on…"
          disabled={status !== 'idle'}
        />
      </div>

      {!file ? (
        <div
          className={`u-drop${dragging ? ' is-drag' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Upload a video clip"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const dropped = e.dataTransfer.files?.[0]
            if (dropped) startUpload(dropped)
          }}
        >
          <div className="u-drop-ic">
            <UploadIcon className="u-ico" />
          </div>
          <h4>Drop your clip here</h4>
          <p>
            Drag a video in, or <span className="u-browse">browse</span> to choose a file.
          </p>
          <span className="u-drop-fmt">MP4 · MOV · WEBM · up to 500 MB</span>
        </div>
      ) : (
        <div className={`u-file${status === 'ready' ? ' is-ready' : ''}`}>
          <div className="u-file-thumb">
            <VideoIcon className="u-ico" />
            {duration && <span className="u-dur">{duration}</span>}
          </div>
          <div className="u-file-main">
            <div className="u-file-name">{file.name}</div>
            <div className="u-file-meta">
              {error
                ? `${file.sizeMB} MB`
                : status === 'ready'
                  ? `${file.sizeMB} MB · upload complete`
                  : `${file.sizeMB} MB · uploading… ${progress}%`}
            </div>
            <div className="u-file-bar">
              <i style={{ width: `${progress}%` }} />
            </div>
            <span className="u-file-status">
              <CheckIcon className="u-ico" />
              Ready to publish
            </span>
            {error && (
              <span className="u-file-status is-error">
                <XIcon className="u-ico" />
                {error}
              </span>
            )}
          </div>
          <button type="button" className="u-file-x" onClick={reset} aria-label="Remove clip">
            <XIcon className="u-ico" />
          </button>
        </div>
      )}
    </>
  )
}
