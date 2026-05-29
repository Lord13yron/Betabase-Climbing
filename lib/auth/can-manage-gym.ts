import { createClient } from '@/lib/supabase/server'

// True if the current user may manage the given gym's walls/routes: an admin, or
// a member of gym_managers for this gym. Mirrors the DB's is_admin() /
// is_gym_manager() RLS checks so the UI matches what the database enforces.
export async function canManageGym(gymId: string): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const [{ data: profile }, { data: manager }] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
    supabase
      .from('gym_managers')
      .select('gym_id')
      .eq('gym_id', gymId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return profile?.is_admin === true || manager != null
}
