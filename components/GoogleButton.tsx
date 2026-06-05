'use client'

import { createClient } from '@/lib/supabase/client'
import { GoogleMark } from './auth/Icon'

/**
 * Restyled to the Betabase ghost-button spec (`.a-btn--ghost`) with the
 * full-color Google mark. Behavior is unchanged from the original
 * components/GoogleButton.tsx — OAuth redirect through /auth/callback.
 */
export function GoogleButton() {
  async function signInWithGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <button
      className="a-btn a-btn--ghost"
      type="button"
      onClick={signInWithGoogle}
    >
      <GoogleMark />
      Continue with Google
    </button>
  )
}
