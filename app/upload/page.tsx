import './upload.css'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UploadPicker } from './UploadPicker'
import { ArrowLeftIcon } from './icons'

// Direct upload path: pick a gym → wall → route, then upload beta inline —
// without first drilling into the route's page. Auth-gated; the existing
// inline-on-route uploader stays as-is. Redesigned onto the brand "concrete
// slate" surface (see app/upload/upload.css); the editorial header + success
// state live inside <UploadPicker> so they can swap client-side.
export default async function UploadPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: gyms }, { data: profile }] = await Promise.all([
    supabase.from('gyms').select('id, name, city').order('name'),
    supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single(),
  ])

  return (
    <div className="u-page">
      <main className="u-main">
        <div className="u-wrap">
          <Link href="/gyms" className="u-crumb">
            <ArrowLeftIcon className="u-ico" />
            Back to gyms
          </Link>
          <UploadPicker
            gyms={gyms ?? []}
            poster={{ username: profile?.username ?? null, avatarUrl: profile?.avatar_url ?? null }}
          />
        </div>
      </main>
    </div>
  )
}
