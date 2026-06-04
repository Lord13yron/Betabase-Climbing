'use client'

import { useActionState } from 'react'
import { sendContactMessage, type ContactState } from './actions'
import { TOPICS } from './topics'

export function ContactForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    sendContactMessage,
    {}
  )

  if (state.ok) {
    return (
      <div className="c-success">
        <h2>Thanks — your message is on its way.</h2>
        <p>We&rsquo;ll get back to you at the email you provided, usually within 1&ndash;2 business days.</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="c-form">
      <div className="c-field">
        <label htmlFor="c-name">Name</label>
        <input id="c-name" name="name" required maxLength={80} className="c-input" placeholder="Your name" />
      </div>

      <div className="c-field">
        <label htmlFor="c-email">Email</label>
        <input
          id="c-email"
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          className="c-input"
          placeholder="you@example.com"
        />
      </div>

      <div className="c-field">
        <label htmlFor="c-topic">Topic</label>
        <div className="c-select-wrap">
          <select id="c-topic" name="topic" required defaultValue="General" className="c-select">
            {TOPICS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="c-field">
        <label htmlFor="c-message">Message</label>
        <textarea
          id="c-message"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          className="c-textarea"
          placeholder="How can we help?"
        />
      </div>

      {/* Honeypot — hidden from humans, catches naive bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="c-hp"
      />

      {state.error && <p className="c-error">{state.error}</p>}

      <button type="submit" disabled={pending} className="c-btn">
        {pending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
