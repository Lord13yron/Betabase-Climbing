import { type NextRequest, NextResponse } from 'next/server'
import { getMux } from '@/lib/mux'
import { createAdminClient } from '@/lib/supabase/admin'

// Mux signature verification needs the raw body + Node crypto.
export const runtime = 'nodejs'

// Mux calls this when an asset finishes (or fails) transcoding. There's no user
// session, so updates go through the service-role client to bypass RLS.
export async function POST(request: NextRequest) {
  const raw = await request.text()

  let event
  try {
    event = await getMux().webhooks.unwrap(raw, request.headers)
  } catch (err) {
    console.error('[mux webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  console.log('[mux webhook] received', event.type)

  if (event.type === 'video.asset.ready' || event.type === 'video.asset.errored') {
    const uploadId = event.data.upload_id
    if (uploadId) {
      const supabase = createAdminClient()
      const update =
        event.type === 'video.asset.ready'
          ? {
              status: 'ready',
              mux_asset_id: event.data.id,
              mux_playback_id: event.data.playback_ids?.[0]?.id ?? null,
            }
          : { status: 'errored' }

      await supabase.from('videos').update(update).eq('mux_upload_id', uploadId)
    }
  }

  return NextResponse.json({ received: true })
}
