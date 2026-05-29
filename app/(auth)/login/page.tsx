'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signInAction, type AuthState } from '../actions'
import { GoogleButton } from '@/components/GoogleButton'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signInAction,
    {}
  )

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Log in</h1>

      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded border border-foreground/20 px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="rounded border border-foreground/20 px-3 py-2"
        />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
        >
          {pending ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <GoogleButton />

      <p className="text-sm text-foreground/70">
        No account?{' '}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>
    </main>
  )
}
