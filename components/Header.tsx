import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOutAction } from '@/app/(auth)/actions'
import { Avatar } from '@/components/Avatar'

export async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let username: string | null = null
  let avatarUrl: string | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()
    username = data?.username ?? null
    avatarUrl = data?.avatar_url ?? null
  }

  return (
    <header className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
      <div className="flex items-center gap-4">
        <Link href="/" className="font-semibold">
          Betabase
        </Link>
        <Link href="/gyms" className="text-sm underline">
          Gyms
        </Link>
      </div>

      {user ? (
        <div className="flex items-center gap-4 text-sm">
          <Link href="/profile" className="flex items-center gap-2">
            <Avatar src={avatarUrl} name={username} size={28} />
            <span className="text-foreground/70">{username ?? user.email}</span>
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="underline">
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login" className="underline">
            Log in
          </Link>
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </div>
      )}
    </header>
  )
}
