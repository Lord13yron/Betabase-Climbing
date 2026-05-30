import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/Avatar'
import { HeightDisplay } from './HeightDisplay'

type PublicProfile = {
  id: string
  username: string
  avatar_url: string | null
  height_cm: number | null
  max_boulder_grade: string | null
  max_route_grade: string | null
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, height_cm, max_boulder_grade, max_route_grade')
    .eq('username', username)
    .single<PublicProfile>()

  if (!profile) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isSelf = user?.id === profile.id

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-8">
      <div className="flex items-center gap-4">
        <Avatar src={profile.avatar_url} name={profile.username} size={80} />
        <div>
          <h1 className="text-2xl font-semibold">{profile.username}</h1>
          {isSelf && (
            <Link href="/profile" className="text-sm underline">
              Edit profile
            </Link>
          )}
        </div>
      </div>

      <dl className="mt-8 flex flex-col gap-3 text-sm">
        <div className="flex justify-between border-b border-foreground/10 pb-2">
          <dt className="text-foreground/70">Height</dt>
          <dd>{profile.height_cm != null ? <HeightDisplay cm={profile.height_cm} /> : '—'}</dd>
        </div>
        <div className="flex justify-between border-b border-foreground/10 pb-2">
          <dt className="text-foreground/70">Max boulder</dt>
          <dd>{profile.max_boulder_grade ?? '—'}</dd>
        </div>
        <div className="flex justify-between border-b border-foreground/10 pb-2">
          <dt className="text-foreground/70">Max route</dt>
          <dd>{profile.max_route_grade ?? '—'}</dd>
        </div>
      </dl>
    </main>
  )
}
