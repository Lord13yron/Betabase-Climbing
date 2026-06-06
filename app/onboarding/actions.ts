'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Onboarding server actions.
 *
 * This is a SUPERSET of your current app/onboarding/actions.ts:
 *  - `claimUsernameAction`  — unchanged behavior (validate → update profile →
 *    redirect), with two additive tweaks: it now also rejects RESERVED handles
 *    and echoes the typed value back in `values` so the client can repopulate.
 *  - `checkUsernameAction`  — NEW. A lightweight availability probe the client
 *    calls (debounced) as the user types, to drive the live ✓ / ✗ field state.
 *
 * If you'd rather not add the live check, delete `checkUsernameAction` and the
 * client falls back to validating format only + letting the submit surface a
 * "taken" error. The screen still works.
 */

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

// Handles we never hand out (routes, system words). Lowercase.
const RESERVED = new Set([
  'admin', 'betabase', 'root', 'support', 'help', 'api', 'about',
  'login', 'signup', 'logout', 'settings', 'onboarding', 'profile',
])

export type OnboardingState = {
  error?: string
  values?: { username?: string }
}

export type UsernameCheck =
  | { status: 'ok' }
  | { status: 'invalid'; message: string }
  | { status: 'reserved'; message: string }
  | { status: 'taken'; message: string }
  | { status: 'error'; message: string }

/**
 * Live availability check — called directly from the client component as a
 * debounced async function (Server Action). Returns a small status the field
 * maps to its ✓ / ✗ / message UI. Does NOT mutate anything.
 */
export async function checkUsernameAction(raw: string): Promise<UsernameCheck> {
  const username = String(raw ?? '').trim()

  if (!USERNAME_RE.test(username)) {
    return { status: 'invalid', message: 'Only letters, numbers, and underscores.' }
  }
  if (RESERVED.has(username.toLowerCase())) {
    return { status: 'reserved', message: 'That handle is reserved.' }
  }

  const supabase = await createClient()
  // Case-insensitive existence check. `ilike` with no wildcards = exact match,
  // case-insensitive — so "Crux" and "crux" collide. Pair this with a
  // case-insensitive UNIQUE index in the DB (see README) so the final claim
  // can't race past it.
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle()

  if (error) return { status: 'error', message: 'Could not check right now.' }
  if (data) return { status: 'taken', message: `@${username} is already taken.` }
  return { status: 'ok' }
}

/**
 * Claim the handle and finish onboarding. Mirrors your existing action; the
 * only changes are the RESERVED guard and returning `values` on error.
 */
export async function claimUsernameAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const username = String(formData.get('username') ?? '').trim()

  if (!USERNAME_RE.test(username)) {
    return { error: 'Use 3–20 letters, numbers, or underscores.', values: { username } }
  }
  if (RESERVED.has(username.toLowerCase())) {
    return { error: 'That username is reserved.', values: { username } }
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
    // 23505 = unique_violation (someone claimed it between check and submit)
    if (error.code === '23505') return { error: 'That username is taken.', values: { username } }
    return { error: error.message, values: { username } }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
