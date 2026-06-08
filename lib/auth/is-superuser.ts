import { createClient } from '@/lib/supabase/server'

// True if the current user is a platform superuser (profiles.is_admin). Gates the
// /admin console. Mirrors the DB's is_admin() RLS check. Unlike canManageGym,
// there is no per-gym manager fallback — this is the whole-network operator.
export async function isSuperuser(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return profile?.is_admin === true
}
