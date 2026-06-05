'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordResetAction, type AuthState } from '../actions'
import { AuthHead } from '@/components/auth/AuthHead'
import { EmailField, AuthError } from '@/components/auth/AuthFields'
import { AuthSubmit } from '@/components/auth/AuthSubmit'
import { MailCheckIcon, ArrowLeftIcon } from '@/components/auth/Icon'

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    requestPasswordResetAction,
    {}
  )

  // ---------- CHECK YOUR EMAIL ----------
  if (state.emailSent) {
    return (
      <section className="a-sent a-anim-in" aria-labelledby="sent-title">
        <div className="a-sent-badge" aria-hidden="true">
          <MailCheckIcon />
        </div>
        <header className="a-head" style={{ marginBottom: 18 }}>
          <p className="a-eyebrow">Almost there</p>
          <h1 className="a-title" id="sent-title">
            Check your <em>email</em>.
          </h1>
          <p className="a-sub">
            If an account exists for{' '}
            <span className="a-mailto">{state.email ?? 'that address'}</span>,
            we sent a link to reset your password.
          </p>
        </header>
        <Link className="a-back" href="/login">
          <ArrowLeftIcon />
          Back to log in
        </Link>
      </section>
    )
  }

  // ---------- REQUEST RESET ----------
  return (
    <section className="a-anim-in" aria-labelledby="forgot-title">
      <AuthHead
        eyebrow="Reset password"
        before="Forgot your"
        accent="password"
        titleId="forgot-title"
        sub="Enter your email and we'll send you a link to set a new one."
      />

      <form action={formAction} className="a-form" noValidate>
        {state.error ? <AuthError>{state.error}</AuthError> : null}
        <EmailField id="forgot-email" />
        <AuthSubmit
          id="forgot-submit"
          pending={pending}
          label="Send reset link"
          pendingLabel="Sending…"
        />
      </form>

      <p className="a-switch">
        Remembered it? <Link href="/login">Log in</Link>
      </p>
    </section>
  )
}
