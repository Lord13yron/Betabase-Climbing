'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUpAction, type AuthState } from '../actions'
import { GoogleButton } from '@/components/GoogleButton'

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signUpAction,
    {}
  )

  if (state.emailSent) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-foreground/70">
          We sent you a confirmation link. Click it to finish creating your
          account.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Sign up</h1>

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
          minLength={6}
          placeholder="Password"
          className="rounded border border-foreground/20 px-3 py-2"
        />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
        >
          {pending ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <GoogleButton />

      <p className="text-sm text-foreground/70">
        Already have an account?{' '}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </main>
  )
}
