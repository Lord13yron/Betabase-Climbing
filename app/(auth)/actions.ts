'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { error?: string; emailSent?: boolean; email?: string }

export async function signInAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }

  // Email confirmation is on, so no session exists yet — tell the UI to show
  // the "check your email" state, and pass the address back so it can be shown.
  return { emailSent: true, email }
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

// Send the password-reset email. The recovery link lands on /auth/confirm, which
// verifies the token_hash (type=recovery) and forwards to /reset-password.
export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '')
  const origin = (await headers()).get('origin') ?? ''

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })

  // Always report success so we don't leak whether the address has an account.
  return { emailSent: true, email }
}

// Set a new password using the recovery session established by /auth/confirm.
export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/')
}
