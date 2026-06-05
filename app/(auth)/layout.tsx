import type { ReactNode } from 'react'
import Link from 'next/link'
import './auth.css'

/**
 * Shared chrome for /login and /signup: the editorial split-screen.
 *  - Left  (.a-visual):   full-bleed climber photo + brand lockup + copy
 *  - Right (.a-form-col): the form column; each page renders into `.a-formwrap`
 *
 * On tablet the photo collapses to a header band; on phones it's hidden and a
 * compact brand header takes over (see auth.css responsive section).
 *
 * NOTE ON GLOBAL CHROME: this screen is full-viewport (100svh) and carries its
 * own brand lockup, so it must NOT be wrapped by the app's <BrandNav> /
 * <SiteFooter>. Those are hidden on the auth routes by pathname (see BrandNav /
 * SiteFooter).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ba-auth a-page">
      {/* ===================== VISUAL PANEL ===================== */}
      <aside className="a-visual">
        {/* Swap for next/image (fill) + real licensed gym photography for prod. */}
        <img
          className="a-visual-img"
          src="/auth/sending-climb.png"
          alt="A climber sending a boulder problem while being filmed in a modern plywood-walled gym"
        />
        <Link className="a-brand" href="/" aria-label="Betabase home">
          <img src="/landing/logo-mark.png" alt="" />
          <span>Betabase</span>
        </Link>
        <div className="a-visual-copy">
          <p className="a-visual-eyebrow">Watch. Learn. Send.</p>
          <h2 className="a-visual-head">
            Every gym. Every route. Every <em>beta</em>.
          </h2>
          <div className="a-visual-caption">
            <span className="a-dots" aria-hidden="true">
              <i style={{ background: 'var(--color-hold-red)' }} />
              <i style={{ background: 'var(--color-hold-yellow)' }} />
              <i style={{ background: 'var(--color-hold-green)' }} />
              <i style={{ background: 'var(--color-hold-blue)' }} />
              <i style={{ background: 'var(--color-hold-purple)' }} />
            </span>
            <span>Join climbers sharing beta at their home gym.</span>
          </div>
        </div>
      </aside>

      {/* ===================== FORM PANEL ===================== */}
      <main className="a-form-col">
        <div className="a-formwrap">
          <Link className="a-brand-mobile" href="/" aria-label="Betabase home">
            <img src="/landing/logo-mark.png" alt="" />
            <span>Betabase</span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}
