'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signInAction, type AuthState } from '../actions'
import { GoogleButton } from '@/components/GoogleButton'
import { AuthHead } from '@/components/auth/AuthHead'
import { EmailField, PasswordField, AuthError } from '@/components/auth/AuthFields'
import { AuthSubmit, OrDivider } from '@/components/auth/AuthSubmit'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signInAction,
    {}
  )

  return (
    <section className="a-anim-in" aria-labelledby="login-title">
      <AuthHead
        eyebrow="Welcome back"
        before="Pick up where you"
        accent="left off"
        titleId="login-title"
        sub="Log in to find your gym, watch beta, and keep logging your sends."
      />

      <form action={formAction} className="a-form" noValidate>
        {state.error ? <AuthError>{state.error}</AuthError> : null}
        <EmailField id="login-email" />
        <PasswordField id="login-password" mode="current" />
        <AuthSubmit
          id="login-submit"
          pending={pending}
          label="Log in"
          pendingLabel="Logging in…"
        />
      </form>

      <OrDivider />
      <GoogleButton />

      <p className="a-switch">
        New to Betabase? <Link href="/signup">Create an account</Link>
      </p>
    </section>
  )
}
