import { type NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getMux } from '@/lib/mux'

// Mux SDK + crypto need the Node runtime, not edge.
export const runtime = 'nodejs'

// Authed: creates a Mux direct upload and a pending videos row, returns the
// upload URL for <MuxUploader> to push the file straight to Mux. The webhook
// fills in asset/playback ids and flips status to ready later.
//
// Two auth paths: browser requests carry the session cookie; the mobile app
// has no cookies and sends `Authorization: Bearer <access_token>` instead.
// Either way all queries below run as the resolved user under RLS.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const supabase = authHeader?.startsWith('Bearer ')
    ? createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false, autoRefreshToken: false },
        }
      )
    : await createClient()
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

  // Cap uploads per user per hour so a scripted client can't run up the Mux
  // bill — direct uploads have no server-enforceable size limit.
  const { count } = await supabase
    .from('videos')
    .select('id', { count: 'exact', head: true })
    .eq('uploader_id', user.id)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
  if ((count ?? 0) >= 10) {
    return NextResponse.json(
      { error: 'Upload limit reached. Try again later.' },
      { status: 429 }
    )
  }

  // Confirm the route exists before creating the Mux upload, so a bad id
  // doesn't leave an orphaned upload behind when the insert's FK fails.
  const { data: route } = await supabase
    .from('routes')
    .select('id')
    .eq('id', routeId)
    .maybeSingle()
  if (!route) {
    return NextResponse.json({ error: 'Route not found.' }, { status: 400 })
  }

  const upload = await getMux().video.uploads.create({
    cors_origin: request.nextUrl.origin,
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
    // Best-effort: don't leave the just-created upload dangling on Mux.
    await getMux()
      .video.uploads.cancel(upload.id)
      .catch(() => {})
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ url: upload.url })
}
