'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canManageGym } from '@/lib/auth/can-manage-gym'
import { deleteMuxAssets } from '@/lib/mux'
import { type Discipline, gradeOrder } from '@/lib/grades'

export type FormState = { error?: string; ok?: boolean }

const DISCIPLINES: Discipline[] = ['boulder', 'top_rope', 'lead']

function revalidateGym(gymId: string) {
  revalidatePath(`/gyms/${gymId}/manage`)
  revalidatePath(`/gyms/${gymId}`)
}

// --- Walls ---------------------------------------------------------------

export async function createWallAction(
  gymId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  if (!(await canManageGym(gymId))) return { error: 'Not authorized.' }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Wall name is required.' }

  const supabase = await createClient()
  const { data: last } = await supabase
    .from('walls')
    .select('sort_order')
    .eq('gym_id', gymId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase
    .from('walls')
    .insert({ gym_id: gymId, name, sort_order: (last?.sort_order ?? -1) + 1 })

  if (error) return { error: error.message }

  revalidateGym(gymId)
  return { ok: true }
}

export async function renameWallAction(
  gymId: string,
  wallId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  if (!(await canManageGym(gymId))) return { error: 'Not authorized.' }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Wall name is required.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('walls')
    .update({ name })
    .eq('id', wallId)
    .eq('gym_id', gymId)

  if (error) return { error: error.message }

  revalidateGym(gymId)
  return { ok: true }
}

export async function deleteWallAction(
  gymId: string,
  wallId: string
): Promise<FormState> {
  if (!(await canManageGym(gymId))) return { error: 'Not authorized.' }

  const supabase = await createClient()

  // Clean up the Mux assets for this wall's routes before the wall (and its
  // routes/videos) cascade away in the DB.
  const { data: videos } = await supabase
    .from('videos')
    .select('mux_asset_id, routes!inner(wall_id, gym_id)')
    .eq('routes.wall_id', wallId)
    .eq('routes.gym_id', gymId)
    .returns<{ mux_asset_id: string | null }[]>()
  await deleteMuxAssets((videos ?? []).map((v) => v.mux_asset_id))

  const { error } = await supabase
    .from('walls')
    .delete()
    .eq('id', wallId)
    .eq('gym_id', gymId)

  if (error) return { error: error.message }

  revalidateGym(gymId)
  return { ok: true }
}

// Swap this wall's sort_order with its neighbor in the given direction.
export async function moveWallAction(
  gymId: string,
  wallId: string,
  direction: 'up' | 'down'
): Promise<FormState> {
  if (!(await canManageGym(gymId))) return { error: 'Not authorized.' }

  const supabase = await createClient()
  const { data: walls, error: readError } = await supabase
    .from('walls')
    .select('id, sort_order')
    .eq('gym_id', gymId)
    .order('sort_order')

  if (readError) return { error: readError.message }
  if (!walls) return { ok: true }

  const index = walls.findIndex((w) => w.id === wallId)
  const neighborIndex = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || neighborIndex < 0 || neighborIndex >= walls.length) {
    return { ok: true }
  }

  const current = walls[index]
  const neighbor = walls[neighborIndex]
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase
      .from('walls')
      .update({ sort_order: neighbor.sort_order })
      .eq('id', current.id),
    supabase
      .from('walls')
      .update({ sort_order: current.sort_order })
      .eq('id', neighbor.id),
  ])

  if (e1 || e2) return { error: (e1 ?? e2)!.message }

  revalidateGym(gymId)
  return { ok: true }
}

// --- Videos --------------------------------------------------------------

export type RouteVideo = {
  id: string
  status: 'pending' | 'ready' | 'errored'
  mux_playback_id: string | null
  caption: string | null
  view_count: number
  created_at: string
  uploader_id: string
  profiles: { username: string; avatar_url: string | null } | null
}

// Load a single route's videos for the manage modal, newest first. Guarded by
// canManageGym so only the gym's managers/admins can enumerate its clips; the
// modal deletes via the shared deleteVideoAction (which re-authorizes).
export async function listRouteVideosAction(
  gymId: string,
  routeId: string
): Promise<{ error?: string; videos?: RouteVideo[] }> {
  if (!(await canManageGym(gymId))) return { error: 'Not authorized.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('videos')
    .select('id, status, mux_playback_id, caption, view_count, created_at, uploader_id, profiles(username, avatar_url)')
    .eq('route_id', routeId)
    .order('created_at', { ascending: false })
    .returns<RouteVideo[]>()

  if (error) return { error: error.message }
  return { videos: data ?? [] }
}

// --- Routes --------------------------------------------------------------

// Shared create/edit. routeId null => insert, otherwise update.
export async function saveRouteAction(
  gymId: string,
  routeId: string | null,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  if (!(await canManageGym(gymId))) return { error: 'Not authorized.' }

  const name = String(formData.get('name') ?? '').trim()
  const discipline = String(formData.get('discipline') ?? '') as Discipline
  const gradeLabel = String(formData.get('grade_label') ?? '')
  const colorRaw = String(formData.get('color') ?? '').trim()
  const wallRaw = String(formData.get('wall_id') ?? '')
  const setDateRaw = String(formData.get('set_date') ?? '')

  if (!name) return { error: 'Route name is required.' }
  if (!DISCIPLINES.includes(discipline)) return { error: 'Invalid discipline.' }

  const order = gradeOrder(discipline, gradeLabel)
  if (order === null) return { error: 'Invalid grade for this discipline.' }

  const row = {
    gym_id: gymId,
    name,
    discipline,
    grade_label: gradeLabel,
    grade_order: order,
    color: colorRaw || null,
    wall_id: wallRaw || null,
    set_date: setDateRaw || null,
  }

  const supabase = await createClient()
  const { error } = routeId
    ? await supabase.from('routes').update(row).eq('id', routeId).eq('gym_id', gymId)
    : await supabase.from('routes').insert(row)

  if (error) return { error: error.message }

  revalidateGym(gymId)
  return { ok: true }
}

export async function deleteRouteAction(
  gymId: string,
  routeId: string
): Promise<FormState> {
  if (!(await canManageGym(gymId))) return { error: 'Not authorized.' }

  const supabase = await createClient()

  // Clean up the route's Mux assets before its videos cascade away in the DB.
  const { data: videos } = await supabase
    .from('videos')
    .select('mux_asset_id')
    .eq('route_id', routeId)
    .returns<{ mux_asset_id: string | null }[]>()
  await deleteMuxAssets((videos ?? []).map((v) => v.mux_asset_id))

  const { error } = await supabase
    .from('routes')
    .delete()
    .eq('id', routeId)
    .eq('gym_id', gymId)

  if (error) return { error: error.message }

  revalidateGym(gymId)
  return { ok: true }
}

// Delete every route on a wall (keeping the wall). Video rows cascade in the DB,
// but the hosted Mux assets don't — so we delete those first. The wall stays;
// only its routes are wiped.
export async function clearWallRoutesAction(
  gymId: string,
  wallId: string
): Promise<FormState> {
  if (!(await canManageGym(gymId))) return { error: 'Not authorized.' }

  const supabase = await createClient()

  const { data: videos } = await supabase
    .from('videos')
    .select('mux_asset_id, routes!inner(wall_id, gym_id)')
    .eq('routes.wall_id', wallId)
    .eq('routes.gym_id', gymId)
    .returns<{ mux_asset_id: string | null }[]>()
  await deleteMuxAssets((videos ?? []).map((v) => v.mux_asset_id))

  const { error } = await supabase
    .from('routes')
    .delete()
    .eq('wall_id', wallId)
    .eq('gym_id', gymId)

  if (error) return { error: error.message }

  revalidateGym(gymId)
  return { ok: true }
}
