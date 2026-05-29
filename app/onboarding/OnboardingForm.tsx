'use client'

import { useActionState } from 'react'
import { claimUsernameAction, type OnboardingState } from './actions'

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    claimUsernameAction,
    {}
  )

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="username"
        required
        autoFocus
        placeholder="username"
        className="rounded border border-foreground/20 px-3 py-2"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Continue'}
      </button>
    </form>
  )
}
