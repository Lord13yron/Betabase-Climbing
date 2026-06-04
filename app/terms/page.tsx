import '../legal.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service · Betabase',
  description:
    'The terms that govern your use of Betabase, including the climbing safety disclaimer, content rules, and user responsibilities.',
}

export default function TermsPage() {
  return (
    <div className="lg-page">
      <main className="lg-main">
        <div className="lg-wrap">
          <header className="lg-hero">
            <span className="lg-eyebrow">Terms</span>
            <h1 className="lg-title">Terms of Service</h1>
            <span className="lg-updated">Last updated June 4, 2026</span>
            <p className="lg-sub">
              These terms govern your use of Betabase. Please read them carefully &mdash; they include an important
              safety disclaimer about climbing. By using the service, you agree to these terms.
            </p>
          </header>

          <div className="lg-body">
            <section className="lg-section">
              <h2 className="lg-h2">1. Acceptance</h2>
              <p>
                By creating an account or otherwise using Betabase, you agree to be bound by these Terms of Service and
                our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the service.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">2. Eligibility</h2>
              <p>
                You must be at least 13 years old to use Betabase. If you are between 13 and 17, you may only use the
                service with the permission and supervision of a parent or guardian, who agrees to these terms on your
                behalf. The service is not available to anyone under 13.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">3. Your account</h2>
              <p>
                You are responsible for keeping your login credentials secure and for all activity that happens under
                your account. Let us know promptly if you believe your account has been compromised.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">4. Your content and the license you grant</h2>
              <p>
                You keep ownership of the beta videos, captions, comments, and other content you upload
                (&ldquo;your content&rdquo;). By uploading it, you grant Betabase a worldwide, non-exclusive,
                royalty-free license to host, store, reproduce, reformat and transcode, stream, and display your
                content for the purpose of operating and providing the service. This license ends when you delete your
                content or your account, except for copies retained in routine backups or as required by law.
              </p>
              <p>
                You represent that you own or have the necessary rights to the content you upload, that it does not
                infringe anyone else&rsquo;s rights, and that any people identifiable in your videos have consented to
                appear.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">5. Acceptable use</h2>
              <p>You agree not to:</p>
              <ul>
                <li>Upload content you do not have the rights to share, or that infringes intellectual property.</li>
                <li>Harass, threaten, impersonate, or harm other users.</li>
                <li>Post unlawful, hateful, sexually explicit, or otherwise objectionable content.</li>
                <li>Attempt to disrupt, overload, reverse-engineer, or gain unauthorized access to the service.</li>
                <li>Use the service for spam or commercial solicitation without our permission.</li>
              </ul>
            </section>

            <div className="lg-callout">
              <h2 className="lg-h2">6. Climbing safety &amp; assumption of risk</h2>
              <p>
                <strong>Climbing is an inherently dangerous activity that can result in serious injury or death.</strong>{' '}
                The beta videos and information on Betabase are shared by community members. They are personal opinions
                and demonstrations &mdash; not professional instruction, coaching, or safety advice &mdash; and they may
                be inaccurate, incomplete, or unsafe for your body, ability, or situation.
              </p>
              <p>
                You climb entirely at your own risk. You are solely responsible for your own safety, for using proper
                equipment and technique, for following the rules and supervision of your gym, and for deciding whether
                any beta is appropriate for you. By using Betabase, you assume all risks associated with climbing and
                with relying on any content found on the service.
              </p>
            </div>

            <section className="lg-section">
              <h2 className="lg-h2">7. Disclaimer of warranties</h2>
              <p>
                The service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any
                kind, whether express or implied, including fitness for a particular purpose, accuracy, or
                uninterrupted availability. We do not warrant that any content on the service is accurate, reliable, or
                safe.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">8. Limitation of liability</h2>
              <p>
                To the fullest extent permitted by law, Betabase and its operator will not be liable for any indirect,
                incidental, special, consequential, or punitive damages, or for any personal injury, death, or loss
                arising out of or related to your use of the service or any content on it. Where liability cannot be
                excluded, our total liability to you is limited to the greater of the amount you paid us in the twelve
                months before the claim, or CAD $100.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">9. Moderation and termination</h2>
              <p>
                We may remove content or suspend or terminate accounts that violate these terms or that we reasonably
                believe are harmful, unlawful, or infringing. You may stop using the service and request deletion of
                your account at any time through our <Link href="/contact">contact page</Link>.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">10. Copyright and takedowns</h2>
              <p>
                We respect intellectual property rights. If you believe content on Betabase infringes your copyright,
                send us a notice through our <Link href="/contact">contact page</Link> that identifies the work, the
                infringing content and where it appears, your contact information, and a statement that you have a
                good-faith belief the use is unauthorized. We will review valid notices and remove infringing content.
                We terminate the accounts of repeat infringers.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">11. Third-party services</h2>
              <p>
                Betabase relies on third-party providers (such as our hosting, authentication, and video providers) to
                operate. Their availability and performance are outside our control, and your use of the service is
                also subject to their terms where applicable.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">12. Changes to these terms</h2>
              <p>
                We may update these terms from time to time. When we do, we will revise the &ldquo;Last updated&rdquo;
                date above. Your continued use of the service after changes take effect means you accept the updated
                terms.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">13. Governing law</h2>
              <p>
                These terms are governed by the laws of the Province of British Columbia and the federal laws of Canada
                that apply there, without regard to conflict-of-law rules. The courts of British Columbia have
                jurisdiction over any dispute arising from these terms or the service.
              </p>
            </section>

            <section className="lg-section">
              <h2 className="lg-h2">Contact</h2>
              <p>
                Questions about these terms? Reach us through our <Link href="/contact">contact page</Link>. See also
                our <Link href="/privacy">Privacy Policy</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
