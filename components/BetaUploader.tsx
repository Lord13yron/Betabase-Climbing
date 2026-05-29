'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MuxUploader from '@mux/mux-uploader-react'

// Lets any signed-in user add a beta clip. The endpoint callback hits our authed
// API to mint a Mux direct-upload URL (and create the pending row), then
// <MuxUploader> pushes the file straight to Mux. On success we refresh so the
// new "Processing…" card appears.
export function BetaUploader({ routeId }: { routeId: string }) {
  const router = useRouter()
  const [caption, setCaption] = useState('')

  // Recreated each render, so it captures the latest caption; <MuxUploader>
  // calls it when the upload starts.
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

  return (
    <div className="rounded-lg border border-foreground/15 p-4">
      <label className="block text-sm font-medium">Add beta</label>
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        maxLength={140}
        className="mt-2 w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm"
      />
      <MuxUploader
        className="mt-3 block"
        endpoint={getEndpoint}
        onSuccess={() => {
          setCaption('')
          router.refresh()
        }}
      />
    </div>
  )
}
