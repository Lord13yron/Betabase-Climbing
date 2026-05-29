'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canManageGym } from '@/lib/auth/can-manage-gym'
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
  const { error } = await supabase
    .from('routes')
    .delete()
    .eq('id', routeId)
    .eq('gym_id', gymId)

  if (error) return { error: error.message }

  revalidateGym(gymId)
  return { ok: true }
}
