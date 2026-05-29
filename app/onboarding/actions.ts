'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type OnboardingState = { error?: string }

export async function claimUsernameAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const username = String(formData.get('username') ?? '').trim()
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { error: 'Use 3–20 letters, numbers, or underscores.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505') return { error: 'That username is taken.' }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
