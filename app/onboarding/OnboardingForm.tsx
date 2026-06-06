'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import {
  claimUsernameAction,
  checkUsernameAction,
  type OnboardingState,
} from './actions'

/**
 * The interactive half of /onboarding: the username field with live
 * availability (debounced Server Action), a live "how you'll appear" preview,
 * and the submit that runs the real `claimUsernameAction` via useActionState.
 *
 * Field state machine (drives `data-state` on .o-inputwrap + the helper line):
 *   idle      → empty / <3 chars (neutral hint)
 *   bad       → fails format, reserved, or taken (red ✗)
 *   checking  → valid format, awaiting the server probe (spinner)
 *   ok        → available (green ✓, submit enabled)
 */

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
const MAX = 20
const DEBOUNCE_MS = 450

type Avail =
  | { kind: 'idle'; tone: 'neutral'; message: string }
  | { kind: 'checking'; tone: 'neutral'; message: string }
  | { kind: 'ok'; tone: 'ok'; message: string }
  | { kind: 'bad'; tone: 'bad'; message: string }

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    claimUsernameAction,
    {},
  )
  const [value, setValue] = useState(state.values?.username ?? '')
  const [avail, setAvail] = useState<Avail>({
    kind: 'idle',
    tone: 'neutral',
    message: '3–20 letters, numbers, or _',
  })
  const seq = useRef(0)

  const username = value.trim()
  const okHandle = avail.kind === 'ok'

  // Validate + (debounced) probe availability whenever the value changes.
  useEffect(() => {
    if (username.length === 0) {
      setAvail({ kind: 'idle', tone: 'neutral', message: '3–20 letters, numbers, or _' })
      return
    }
    if (username.length < 3) {
      setAvail({ kind: 'idle', tone: 'neutral', message: 'Keep going — at least 3 characters.' })
      return
    }
    if (!USERNAME_RE.test(username)) {
      setAvail({ kind: 'bad', tone: 'bad', message: 'Only letters, numbers, and underscores.' })
      return
    }

    setAvail({ kind: 'checking', tone: 'neutral', message: 'Checking availability…' })
    const id = ++seq.current
    const t = setTimeout(async () => {
      try {
        const res = await checkUsernameAction(username)
        if (id !== seq.current) return // a newer keystroke superseded this one
        if (res.status === 'ok') {
          setAvail({ kind: 'ok', tone: 'ok', message: `@${username} is yours.` })
        } else {
          setAvail({ kind: 'bad', tone: 'bad', message: res.message })
        }
      } catch {
        if (id !== seq.current) return
        setAvail({ kind: 'bad', tone: 'bad', message: 'Could not check right now.' })
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [username])

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value
    if (v.startsWith('@')) v = v.slice(1) // forgive a typed leading @
    v = v.replace(/\s+/g, '') // no spaces in handles
    setValue(v.slice(0, MAX))
  }

  // A server error after submit (e.g. a claim race) overrides the live helper.
  const serverError = !pending ? state.error : undefined
  const helpTone = serverError ? 'bad' : avail.tone
  const helpText = serverError ?? avail.message

  const initial = username ? username.charAt(0).toUpperCase() : '?'

  return (
    <form action={formAction} className="o-form" noValidate>
      <div className="o-field">
        <div className="o-label-row">
          <label className="o-label" htmlFor="username">Username</label>
          <span className="o-count">{username.length} / {MAX}</span>
        </div>

        <div className="o-inputwrap" data-state={avail.kind}>
          <span className="o-at" aria-hidden="true">@</span>
          <input
            id="username"
            name="username"
            className="o-input"
            type="text"
            value={value}
            onChange={onChange}
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="yourhandle"
            maxLength={MAX}
            required
            autoFocus
            aria-describedby="o-help"
          />
          <span className="o-status" aria-hidden="true">
            <span className="o-spin" />
            <svg className="o-ico o-ico-ok" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="m8.5 12.2 2.3 2.3 4.7-4.9" />
            </svg>
            <svg className="o-ico o-ico-bad" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="m9 9 6 6" />
              <path d="m15 9-6 6" />
            </svg>
          </span>
        </div>

        <p className="o-help" id="o-help" data-tone={helpTone} role="status" aria-live="polite">
          {helpText}
        </p>
      </div>

      {/* live "how you'll appear" preview */}
      <div className="o-preview-wrap">
        <span className="o-preview-label">How you'll appear</span>
        <div className="o-preview">
          <span className="o-avatar">{initial}</span>
          <div className="o-preview-body">
            <div className="o-preview-name">
              {username ? `@${username}` : <span className="ghost">@yourhandle</span>}
            </div>
            <div className="o-preview-meta">
              <svg className="o-ico" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 3 4 7v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7l-4-4Z" />
                <path d="M4 7h16" />
              </svg>
              <span>Climbing since 2026</span>
              <span className="dot" />
              <span>0 sends</span>
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className={`o-btn${pending ? ' is-pending' : ''}`}
        disabled={!okHandle || pending}
      >
        <span className="o-btn-spin" aria-hidden="true" />
        <span className="o-btn-label">{pending ? 'Setting up…' : 'Enter Betabase'}</span>
        <svg className="o-ico o-arrow" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </button>
    </form>
  )
}
