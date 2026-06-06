import './onboarding.css'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOutAction } from '@/app/(auth)/actions'
import { OnboardingForm } from './OnboardingForm'

/**
 * /onboarding — the post-signup "claim your handle" step.
 *
 * Same auth guard as before (must be logged in; bounce to "/" if a username
 * already exists), now rendered inside the editorial split-screen shell that
 * matches /login + /signup. The left visual panel is static (server); the
 * interactive field + live preview live in <OnboardingForm> (client).
 *
 * GLOBAL CHROME: like the auth screens this is full-viewport (100svh) and
 * carries its own brand lockup — it is NOT wrapped by <BrandNav> /
 * <SiteFooter>, which hide themselves on "/onboarding" via their AUTH_ROUTES set.
 */
export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  if (profile?.username) redirect('/')

  return (
    <div className="ba-onboard o-page">
      {/* ===================== VISUAL PANEL ===================== */}
      <aside className="o-visual">
        {/* Swap for next/image (fill) + real licensed gym photography for prod. */}
        <img
          className="o-visual-img"
          src="/onboarding/filming-climb.png"
          alt="A climber being filmed on a plywood bouldering wall in a modern gym"
        />
        <Link className="o-brand" href="/" aria-label="Betabase home">
          <img src="/landing/logo-mark.png" alt="" />
          <span>Betabase</span>
        </Link>
        <div className="o-visual-copy">
          <p className="o-visual-eyebrow">Welcome, climber</p>
          <h2 className="o-visual-head">
            Now make it <em>yours</em>.
          </h2>
          <div className="o-visual-caption">
            <span className="o-dots" aria-hidden="true">
              <i style={{ background: 'var(--color-hold-red)' }} />
              <i style={{ background: 'var(--color-hold-yellow)' }} />
              <i style={{ background: 'var(--color-hold-green)' }} />
              <i style={{ background: 'var(--color-hold-blue)' }} />
              <i style={{ background: 'var(--color-hold-purple)' }} />
            </span>
            <span>Your handle rides on every beta, send, and comment.</span>
          </div>
        </div>
      </aside>

      {/* ===================== FORM PANEL ===================== */}
      <main className="o-form-col">
        <div className="o-formwrap o-anim-in">
          <Link className="o-brand-mobile" href="/" aria-label="Betabase home">
            <img src="/landing/logo-mark.png" alt="" />
            <span>Betabase</span>
          </Link>

          <div className="o-step">
            <span className="o-step-track" aria-hidden="true">
              <i className="is-done" />
              <i className="is-now" />
            </span>
            <span className="o-step-label">Step 02 · Last one</span>
          </div>

          <header className="o-head">
            <p className="o-eyebrow">Set up your profile</p>
            <h1 className="o-title">
              Claim your <em>handle</em>.
            </h1>
            <p className="o-sub">
              This is how other climbers will see you across Betabase — on your beta
              videos, your sends, and your comments.
            </p>
          </header>

          {/* interactive field + live preview + submit */}
          <OnboardingForm />

          <p className="o-foot">
            <svg className="o-ico" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2 4 5v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V5Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>
              You can fine-tune the rest — <strong>avatar, height, and max grade</strong> —
              anytime from your profile.
            </span>
          </p>

          <form action={signOutAction} className="o-signout">
            Not you? <button type="submit">Sign out</button>
          </form>
        </div>
      </main>
    </div>
  )
}
