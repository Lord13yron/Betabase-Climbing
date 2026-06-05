'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { updatePasswordAction, type AuthState } from '../actions'
import { AuthHead } from '@/components/auth/AuthHead'
import { PasswordField, AuthError } from '@/components/auth/AuthFields'
import { AuthSubmit } from '@/components/auth/AuthSubmit'

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    updatePasswordAction,
    {}
  )

  return (
    <section className="a-anim-in" aria-labelledby="reset-title">
      <AuthHead
        eyebrow="Set a new password"
        before="Choose a new"
        accent="password"
        titleId="reset-title"
        sub="Pick something you'll remember. You'll be signed in once it's saved."
      />

      <form action={formAction} className="a-form" noValidate>
        {state.error ? <AuthError>{state.error}</AuthError> : null}
        <PasswordField id="reset-password" mode="new" />
        <AuthSubmit
          id="reset-submit"
          pending={pending}
          label="Update password"
          pendingLabel="Saving…"
        />
      </form>

      <p className="a-switch">
        <Link href="/login">Back to log in</Link>
      </p>
    </section>
  )
}
