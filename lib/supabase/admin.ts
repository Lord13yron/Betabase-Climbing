import { createClient } from '@supabase/supabase-js'

// Service-role client that bypasses RLS. Only for trusted server contexts with
// no user session — e.g. the Mux webhook, which Mux calls (not a logged-in
// user) and which must flip a video's status. Never import this into a client
// component or expose the key.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
