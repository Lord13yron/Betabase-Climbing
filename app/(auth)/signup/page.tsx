'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUpAction, type AuthState } from '../actions'
import { GoogleButton } from '@/components/GoogleButton'
import { AuthHead } from '@/components/auth/AuthHead'
import { EmailField, PasswordField, AuthError } from '@/components/auth/AuthFields'
import { AuthSubmit, OrDivider } from '@/components/auth/AuthSubmit'
import { MailCheckIcon, ArrowLeftIcon } from '@/components/auth/Icon'

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signUpAction,
    {}
  )

  // ---------- CHECK YOUR EMAIL ----------
  // signUpAction returns { emailSent: true } when confirmation is required.
  // `state.email` is the address the user typed (see actions.ts note below).
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
            We sent a confirmation link to{' '}
            <span className="a-mailto">{state.email ?? 'your inbox'}</span>. Click
            it to finish creating your account.
          </p>
        </header>
        <Link className="a-back" href="/login">
          <ArrowLeftIcon />
          Back to log in
        </Link>
      </section>
    )
  }

  // ---------- SIGN UP ----------
  return (
    <section className="a-anim-in" aria-labelledby="signup-title">
      <AuthHead
        eyebrow="Join the community"
        before="Start your"
        accent="logbook"
        titleId="signup-title"
        sub="Create an account to track sends, favorite gyms, and give back your beta."
      />

      <form action={formAction} className="a-form" noValidate>
        {state.error ? <AuthError>{state.error}</AuthError> : null}
        <EmailField id="signup-email" />
        <PasswordField id="signup-password" mode="new" />
        <AuthSubmit
          id="signup-submit"
          pending={pending}
          label="Create account"
          pendingLabel="Creating account…"
        />
      </form>

      <OrDivider />
      <GoogleButton />

      <p className="a-legal">
        By creating an account you agree to our <Link href="/terms">Terms</Link>{' '}
        &amp; <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <p className="a-switch">
        Already climbing with us? <Link href="/login">Log in</Link>
      </p>
    </section>
  )
}
