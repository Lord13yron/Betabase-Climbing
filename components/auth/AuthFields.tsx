'use client'

import { useState, type ReactNode } from 'react'
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon } from './Icon'

/** Email field: labeled input with a leading mail icon. */
export function EmailField({
  id = 'email',
  defaultValue,
}: {
  id?: string
  defaultValue?: string
}) {
  return (
    <div className="a-field">
      <label className="a-label" htmlFor={id}>
        Email
      </label>
      <div className="a-inputwrap">
        <MailIcon />
        <input
          className="a-input"
          id={id}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          defaultValue={defaultValue}
          required
        />
      </div>
    </div>
  )
}

/**
 * Password field with leading lock icon + show/hide reveal toggle.
 * `mode="new"` is for sign-up (adds the "At least 6 characters" hint,
 * autocomplete="new-password", minLength=6, and an optional "Forgot?" link is
 * omitted); `mode="current"` is for log-in (adds the "Forgot?" link).
 */
export function PasswordField({
  id = 'password',
  mode = 'current',
  forgotHref = '/forgot-password',
}: {
  id?: string
  mode?: 'current' | 'new'
  forgotHref?: string
}) {
  const [shown, setShown] = useState(false)
  const isNew = mode === 'new'

  return (
    <div className="a-field">
      {isNew ? (
        <label className="a-label" htmlFor={id}>
          Password
        </label>
      ) : (
        <div className="a-label-row">
          <label className="a-label" htmlFor={id}>
            Password
          </label>
          <a className="a-forgot" href={forgotHref}>
            Forgot?
          </a>
        </div>
      )}

      <div className="a-inputwrap">
        <LockIcon />
        <input
          className="a-input has-toggle"
          id={id}
          name="password"
          type={shown ? 'text' : 'password'}
          autoComplete={isNew ? 'new-password' : 'current-password'}
          placeholder={isNew ? 'Create a password' : 'Your password'}
          minLength={isNew ? 6 : undefined}
          required
        />
        <button
          className="a-reveal"
          type="button"
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
        >
          {shown ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {isNew ? <p className="a-hint">At least 6 characters.</p> : null}
    </div>
  )
}

/** Inline error banner shown above the form fields on a failed submit. */
export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div className="a-error" role="alert">
      <svg className="a-ico" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4.5" />
        <path d="M12 16h.01" />
      </svg>
      <span>{children}</span>
    </div>
  )
}
