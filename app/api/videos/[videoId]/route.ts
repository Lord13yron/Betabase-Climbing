import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getMux } from '@/lib/mux'

// Mux SDK needs the Node runtime, not edge.
export const runtime = 'nodejs'

// Mobile-only delete: the app cannot reach the Mux SDK, so it calls this
// instead of deleting the videos row directly (which would orphan the Mux
// asset). Bearer auth only — the website keeps using deleteVideoAction.
// Uploader-only: managers/admins delete from the website.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { videoId } = await params

  const { data: video } = await supabase
    .from('videos')
    .select('uploader_id, mux_asset_id')
    .eq('id', videoId)
    .maybeSingle<{ uploader_id: string; mux_asset_id: string | null }>()
  if (!video) {
    return NextResponse.json({ error: 'Video not found.' }, { status: 404 })
  }
  if (video.uploader_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  if (video.mux_asset_id) {
    try {
      await getMux().video.assets.delete(video.mux_asset_id)
    } catch {
      // Asset may already be gone on Mux's side; deleting the row is what matters.
    }
  }

  // RLS is the backstop, but we've already authorized above.
  const { error } = await supabase.from('videos').delete().eq('id', videoId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
