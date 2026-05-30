'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { V_GRADES, YDS_GRADES } from '@/lib/grades'

export type ProfileState = { error?: string; ok?: boolean }

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const username = String(formData.get('username') ?? '').trim()
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { error: 'Use 3–20 letters, numbers, or underscores.' }
  }

  const heightRaw = String(formData.get('height_cm') ?? '').trim()
  let height_cm: number | null = null
  if (heightRaw) {
    const n = Number(heightRaw)
    if (!Number.isFinite(n) || n <= 0 || n > 300) {
      return { error: 'Enter a valid height.' }
    }
    height_cm = Math.round(n)
  }

  const boulderRaw = String(formData.get('max_boulder_grade') ?? '')
  const routeRaw = String(formData.get('max_route_grade') ?? '')
  if (boulderRaw && !V_GRADES.includes(boulderRaw)) {
    return { error: 'Invalid boulder grade.' }
  }
  if (routeRaw && !YDS_GRADES.includes(routeRaw)) {
    return { error: 'Invalid route grade.' }
  }
  const max_boulder_grade = boulderRaw || null
  const max_route_grade = routeRaw || null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('profiles')
    .update({ username, height_cm, max_boulder_grade, max_route_grade })
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505') return { error: 'That username is taken.' }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

// Persists the public URL after the client uploads the file straight to Storage.
export async function updateAvatarAction(avatarUrl: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)
  revalidatePath('/', 'layout')
}
