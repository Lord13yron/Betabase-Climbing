import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UploadPicker } from './UploadPicker'

// Direct upload path: pick a gym → wall → route, then upload beta inline —
// without first drilling into the route's page. Auth-gated; the existing
// inline-on-route uploader stays as-is.
export default async function UploadPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: gyms } = await supabase
    .from('gyms')
    .select('id, name, city')
    .order('name')

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Upload beta</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Pick the gym, wall, and route, then add your clip.
      </p>
      <div className="mt-6">
        <UploadPicker gyms={gyms ?? []} />
      </div>
    </main>
  )
}
