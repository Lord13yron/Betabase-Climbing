import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOutAction } from '@/app/(auth)/actions'

export async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let username: string | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
    username = data?.username ?? null
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
          <span className="text-foreground/70">{username ?? user.email}</span>
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
