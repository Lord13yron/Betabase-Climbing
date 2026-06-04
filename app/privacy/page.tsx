import '../legal.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy · Betabase',
  description:
    'How Betabase collects, uses, and protects your personal information under Canadian privacy law (PIPEDA and BC PIPA).',
}

export default function PrivacyPage() {
  return (
    <div className="lg-page">
      <main className="lg-main">
        <div className="lg-wrap">
          <header className="lg-hero">
            <span className="lg-eyebrow">Privacy</span>
            <h1 className="lg-title">Privacy Policy</h1>
            <span className="lg-updated">Last updated June 4, 2026</span>
            <p className="lg-sub">
              This policy explains what personal information Betabase collects, why we collect it, and the choices
              you have. We operate from British Columbia, Canada, and handle your information in accordance with the
              Personal Information Protection and Electronic Documents Act (PIPEDA) and BC&rsquo;s Personal Information
              Protection Act (PIPA).
            </p>
          </header>

          <div className="lg-body">
            <section className="lg-section">
              <h2 className="lg-h2">Who we are</h2>
              <p>
                Betabase is a platform where climbers find their gym, watch community beta videos for the routes on
                each wall, and share their own. In this policy, &ldquo;Betabase,&rdquo; &ldquo;we,&rdquo; and
                &ldquo;us&rdquo; refer to the operator of the Betabase service. &ldquo;You&rdquo; means anyone who
                visits or uses the service.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">Information we collect</h2>
              <p>We collect only what we need to run the service:</p>
              <ul>
                <li>
                  <strong>Account &amp; authentication:</strong> your email address and login credentials, managed
                  through our authentication provider.
                </li>
                <li>
                  <strong>Profile:</strong> the username, height, climbing grades, and avatar image you choose to add.
                </li>
                <li>
                  <strong>Content you upload:</strong> beta videos and their captions, along with technical metadata
                  needed to host and play them.
                </li>
                <li>
                  <strong>Activity:</strong> the videos you view, the climbs you log as sends, the routes you
                  favorite, and the comments you post.
                </li>
                <li>
                  <strong>Contact submissions:</strong> the name, email, topic, and message you send us through our
                  contact form.
                </li>
              </ul>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">How we use your information</h2>
              <ul>
                <li>To create and maintain your account and profile.</li>
                <li>To host, transcode, and stream the beta videos you and others upload.</li>
                <li>To show community activity such as sends, favorites, views, and comments.</li>
                <li>To respond to your contact requests and provide support.</li>
                <li>To keep the service secure, prevent abuse, and comply with our legal obligations.</li>
              </ul>
              <p>
                We do not sell your personal information, and we do not use it for third-party advertising.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">Service providers</h2>
              <p>
                We rely on a small number of trusted providers to operate Betabase. They process information only on
                our behalf and only as needed to provide their service:
              </p>
              <ul>
                <li>
                  <strong>Supabase</strong> &mdash; database, authentication, and file storage (including avatars).
                </li>
                <li>
                  <strong>Mux</strong> &mdash; hosting, transcoding, and streaming of beta videos.
                </li>
                <li>
                  <strong>Google Fonts</strong> &mdash; delivery of the fonts used in the interface.
                </li>
              </ul>
              <p>
                Some of these providers may store or process your information on servers located outside Canada,
                including in the United States. Where that happens, your information may be subject to the laws of
                those jurisdictions.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">Cookies</h2>
              <p>
                We use only essential cookies that keep you signed in and maintain your session. We do not use
                tracking, analytics, or advertising cookies, so no cookie-consent banner is required.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">Data retention</h2>
              <p>
                We keep your information for as long as your account is active or as needed to provide the service.
                When you ask us to delete your account, we remove your personal information within a reasonable period,
                except where we are required to retain it for legal reasons.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">Your rights</h2>
              <p>Under PIPEDA and BC PIPA, you have the right to:</p>
              <ul>
                <li>Access the personal information we hold about you.</li>
                <li>Request correction of information that is inaccurate or incomplete.</li>
                <li>Withdraw your consent to our use of your information.</li>
                <li>Request deletion of your account and associated personal information.</li>
              </ul>
              <p>
                Betabase does not yet offer self-serve account deletion. To exercise any of these rights, please reach
                out through our <Link href="/contact">contact page</Link> and we will action your request.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">Children</h2>
              <p>
                Betabase is intended for climbers aged 13 and older. We do not knowingly collect personal information
                from anyone under 13. If you are between 13 and 17, you must have permission from a parent or guardian
                to use the service. If we learn that we have collected information from a child under 13, we will
                delete it.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">Security</h2>
              <p>
                We use reasonable technical and organizational safeguards to protect your information. No method of
                storage or transmission is completely secure, however, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">Changes to this policy</h2>
              <p>
                We may update this policy from time to time. When we do, we will revise the &ldquo;Last updated&rdquo;
                date above. Significant changes will be communicated through the service.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">Contact</h2>
              <p>
                Questions about this policy or your information? Reach us through our{' '}
                <Link href="/contact">contact page</Link>. See also our{' '}
                <Link href="/terms">Terms of Service</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
