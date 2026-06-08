'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isSuperuser } from '@/lib/auth/is-superuser'
import type { AdminGym, GymStatus } from './types'

export type FormState = { error?: string; ok?: boolean }

const STATUSES: GymStatus[] = ['live', 'draft', 'archived']

// Revalidate both the console and the public directory, since gym status/details
// affect what /gyms lists.
function revalidate() {
  revalidatePath('/admin')
  revalidatePath('/gyms')
}

// --- Gyms ---------------------------------------------------------------

// Returns the created gym so the client can fold in the real server-generated id.
export async function createGymAction(input: {
  name: string
  city: string
  imageUrl: string | null
}): Promise<FormState & { gym?: AdminGym }> {
  if (!(await isSuperuser())) return { error: 'Not authorized.' }

  const name = input.name.trim()
  const city = input.city.trim()
  if (!name) return { error: 'Gym name is required.' }
  if (!city) return { error: 'City / location is required.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('gyms')
    .insert({ name, city, image_url: input.imageUrl || null, status: 'draft' })
    .select('id, name, city, image_url, status')
    .single()
  if (error || !data) return { error: error?.message ?? 'Could not create the gym.' }

  revalidate()
  return {
    ok: true,
    gym: {
      id: data.id,
      name: data.name,
      city: data.city,
      imageUrl: data.image_url,
      status: data.status,
      routeCount: 0,
      chips: [],
    },
  }
}

export async function updateGymAction(
  gymId: string,
  input: { name: string; city: string; imageUrl: string | null; status: GymStatus }
): Promise<FormState> {
  if (!(await isSuperuser())) return { error: 'Not authorized.' }

  const name = input.name.trim()
  const city = input.city.trim()
  if (!name) return { error: 'Gym name is required.' }
  if (!city) return { error: 'City / location is required.' }
  if (!STATUSES.includes(input.status)) return { error: 'Invalid status.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('gyms')
    .update({ name, city, image_url: input.imageUrl || null, status: input.status })
    .eq('id', gymId)
  if (error) return { error: error.message }

  revalidate()
  return { ok: true }
}

export async function setGymStatusAction(
  gymId: string,
  status: GymStatus
): Promise<FormState> {
  if (!(await isSuperuser())) return { error: 'Not authorized.' }
  if (!STATUSES.includes(status)) return { error: 'Invalid status.' }

  const supabase = await createClient()
  const { error } = await supabase.from('gyms').update({ status }).eq('id', gymId)
  if (error) return { error: error.message }

  revalidate()
  return { ok: true }
}

export async function deleteGymAction(gymId: string): Promise<FormState> {
  if (!(await isSuperuser())) return { error: 'Not authorized.' }

  const supabase = await createClient()
  // walls / routes / videos cascade at the DB level; gym_managers cascades too.
  const { error } = await supabase.from('gyms').delete().eq('id', gymId)
  if (error) return { error: error.message }

  revalidate()
  return { ok: true }
}

// --- Admins (gym_managers) ----------------------------------------------

export async function addAdminAction(
  gymId: string,
  userId: string
): Promise<FormState> {
  if (!(await isSuperuser())) return { error: 'Not authorized.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('gym_managers')
    .insert({ gym_id: gymId, user_id: userId })
  // Ignore a duplicate-assignment race (unique PK) — the end state is the same.
  if (error && error.code !== '23505') return { error: error.message }

  revalidate()
  return { ok: true }
}

export async function removeAdminAction(
  gymId: string,
  userId: string
): Promise<FormState> {
  if (!(await isSuperuser())) return { error: 'Not authorized.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('gym_managers')
    .delete()
    .eq('gym_id', gymId)
    .eq('user_id', userId)
  if (error) return { error: error.message }

  revalidate()
  return { ok: true }
}

// --- Messages (contact_messages) ----------------------------------------

export async function markMessageReadAction(
  id: string,
  read: boolean
): Promise<FormState> {
  if (!(await isSuperuser())) return { error: 'Not authorized.' }

  const supabase = await createClient()
  const { error } = await supabase.from('contact_messages').update({ read }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { ok: true }
}

export async function archiveMessageAction(
  id: string,
  archived: boolean
): Promise<FormState> {
  if (!(await isSuperuser())) return { error: 'Not authorized.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('contact_messages')
    .update({ archived })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { ok: true }
}

export async function deleteMessageAction(id: string): Promise<FormState> {
  if (!(await isSuperuser())) return { error: 'Not authorized.' }

  const supabase = await createClient()
  const { error } = await supabase.from('contact_messages').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { ok: true }
}
