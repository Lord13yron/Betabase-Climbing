import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditProfileForm } from './EditProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url, height_cm, max_boulder_grade, max_route_grade')
    .eq('id', user.id)
    .single()

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Edit profile</h1>
      <EditProfileForm
        userId={user.id}
        profile={
          profile ?? {
            username: null,
            avatar_url: null,
            height_cm: null,
            max_boulder_grade: null,
            max_route_grade: null,
          }
        }
      />
    </main>
  )
}
