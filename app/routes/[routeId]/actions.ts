'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canManageGym } from '@/lib/auth/can-manage-gym'
import { getMux } from '@/lib/mux'

export type FormState = { error?: string; ok?: boolean }

export async function deleteVideoAction(videoId: string): Promise<FormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: video } = await supabase
    .from('videos')
    .select('route_id, uploader_id, mux_asset_id, routes(gym_id)')
    .eq('id', videoId)
    .single<{
      route_id: string
      uploader_id: string
      mux_asset_id: string | null
      routes: { gym_id: string } | null
    }>()
  if (!video) return { error: 'Video not found.' }

  const gymId = video.routes?.gym_id
  const allowed =
    video.uploader_id === user.id || (gymId ? await canManageGym(gymId) : false)
  if (!allowed) return { error: 'Not authorized.' }

  if (video.mux_asset_id) {
    try {
      await getMux().video.assets.delete(video.mux_asset_id)
    } catch {
      // Asset may already be gone on Mux's side; deleting the row is what matters.
    }
  }

  // RLS is the backstop, but we've already authorized above.
  const { error } = await supabase.from('videos').delete().eq('id', videoId)
  if (error) return { error: error.message }

  revalidatePath(`/routes/${video.route_id}`)
  return { ok: true }
}

// Toggle the current user's send on a route: remove it if it exists, add it
// otherwise. We read current state first because a toggle has to know which way
// to flip; the unique(route_id, user_id) constraint backstops double-clicks.
export async function toggleSendAction(routeId: string): Promise<FormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: existing } = await supabase
    .from('sends')
    .select('id')
    .eq('route_id', routeId)
    .eq('user_id', user.id)
    .maybeSingle()

  const { error } = existing
    ? await supabase
        .from('sends')
        .delete()
        .eq('route_id', routeId)
        .eq('user_id', user.id)
    : await supabase.from('sends').insert({ route_id: routeId, user_id: user.id })
  if (error) return { error: error.message }

  revalidatePath(`/routes/${routeId}`)
  return { ok: true }
}

const COMMENT_MAX = 1000

// Post a flat comment on a route or a video. `target` carries exactly one id;
// `revalidateRouteId` is the route page to refresh (equals the route for route
// comments, or the parent route for a video comment).
export async function createCommentAction(
  target: { routeId: string } | { videoId: string },
  body: string,
  revalidateRouteId: string
): Promise<FormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const trimmed = body.trim()
  if (!trimmed) return { error: 'Comment is empty.' }
  if (trimmed.length > COMMENT_MAX) return { error: 'Comment is too long.' }

  // Map the camelCase target to the snake_case column the table actually uses.
  const targetColumn =
    'routeId' in target
      ? { route_id: target.routeId }
      : { video_id: target.videoId }

  const { error } = await supabase
    .from('comments')
    .insert({ author_id: user.id, ...targetColumn, body: trimmed })
  if (error) return { error: error.message }

  revalidatePath(`/routes/${revalidateRouteId}`)
  return { ok: true }
}

// Delete a comment if the user is its author, the gym's manager, or an admin.
// RLS is the backstop, but we authorize here too. The gym is resolved from the
// comment's route, or from its video's route.
export async function deleteCommentAction(
  commentId: string,
  revalidateRouteId: string
): Promise<FormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: comment } = await supabase
    .from('comments')
    .select('author_id, routes(gym_id), videos(routes(gym_id))')
    .eq('id', commentId)
    .single<{
      author_id: string
      routes: { gym_id: string } | null
      videos: { routes: { gym_id: string } | null } | null
    }>()
  if (!comment) return { error: 'Comment not found.' }

  const gymId = comment.routes?.gym_id ?? comment.videos?.routes?.gym_id
  const allowed =
    comment.author_id === user.id || (gymId ? await canManageGym(gymId) : false)
  if (!allowed) return { error: 'Not authorized.' }

  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) return { error: error.message }

  revalidatePath(`/routes/${revalidateRouteId}`)
  return { ok: true }
}
