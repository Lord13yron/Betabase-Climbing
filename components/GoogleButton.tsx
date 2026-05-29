'use client'

import { createClient } from '@/lib/supabase/client'

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
      type="button"
      onClick={signInWithGoogle}
      className="w-full rounded border border-foreground/20 px-4 py-2 font-medium hover:bg-foreground/5"
    >
      Continue with Google
    </button>
  )
}
