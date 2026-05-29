import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMux } from '@/lib/mux'

// Mux SDK + crypto need the Node runtime, not edge.
export const runtime = 'nodejs'

// Authed: creates a Mux direct upload and a pending videos row, returns the
// upload URL for <MuxUploader> to push the file straight to Mux. The webhook
// fills in asset/playback ids and flips status to ready later.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { routeId, caption } = await request.json()
  if (!routeId || typeof routeId !== 'string') {
    return NextResponse.json({ error: 'routeId is required.' }, { status: 400 })
  }

  const upload = await getMux().video.uploads.create({
    cors_origin: request.headers.get('origin') ?? '*',
    new_asset_settings: { playback_policy: ['public'] },
  })

  const { error } = await supabase.from('videos').insert({
    route_id: routeId,
    uploader_id: user.id,
    mux_upload_id: upload.id,
    status: 'pending',
    caption: typeof caption === 'string' && caption.trim() ? caption.trim() : null,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ url: upload.url })
}
