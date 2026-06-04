'use server'

import { createClient } from '@/lib/supabase/server'
import { TOPICS } from './topics'

export type ContactState = { error?: string; ok?: boolean }

export async function sendContactMessage(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  // Honeypot: bots fill the hidden "company" field, humans never see it. Pretend
  // success and drop the submission silently.
  if (String(formData.get('company') ?? '').trim()) return { ok: true }

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const topic = String(formData.get('topic') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim()

  if (name.length < 1 || name.length > 80) {
    return { error: 'Please enter your name (up to 80 characters).' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }
  if (!(TOPICS as readonly string[]).includes(topic)) {
    return { error: 'Please choose a topic.' }
  }
  if (message.length < 10 || message.length > 2000) {
    return { error: 'Your message should be between 10 and 2000 characters.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('contact_messages').insert({
    user_id: user?.id ?? null,
    name,
    email,
    topic,
    message,
  })
  if (error) return { error: 'Something went wrong. Please try again.' }

  return { ok: true }
}
