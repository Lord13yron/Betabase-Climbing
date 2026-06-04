import './contact.css'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ContactForm } from './ContactForm'

export const metadata: Metadata = {
  title: 'Contact · Betabase',
  description: 'Get in touch with the Betabase team.',
}

export default async function ContactPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="c-page">
      <main className="c-main">
        <div className="c-wrap">
          <div className="c-hero">
            <span className="c-eyebrow">Get in touch</span>
            <h1 className="c-title">Contact us</h1>
            <p className="c-sub">
              Questions, gym partnerships, bug reports, or feedback — send it our way and we&rsquo;ll get back to you.
            </p>
          </div>

          <div className="c-grid">
            <div className="c-card">
              <ContactForm defaultEmail={user?.email ?? ''} />
            </div>
            <aside className="c-aside">
              <span className="c-aside-label">Response time</span>
              <p className="c-aside-note">We usually reply within 1&ndash;2 business days.</p>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
