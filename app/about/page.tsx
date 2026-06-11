import './about.css'
import type { Metadata } from 'next'
import { CTABand } from '@/components/landing/CTABand'

export const metadata: Metadata = {
  title: 'About · Betabase',
  description: 'Why Betabase exists: community beta for every climbing gym.',
}

export default function AboutPage() {
  return (
    <div className="ab-page">
      <main className="ab-main">
        <div className="ab-wrap">
          <header className="ab-hero">
            <span className="ab-eyebrow">Our story</span>
            <h1 className="ab-title">Beta shouldn&rsquo;t be a secret.</h1>
            <p className="ab-sub">
              Betabase is community beta for every climbing gym. Find your wall, watch how it&rsquo;s
              been climbed, and share your own send.
            </p>
          </header>

          <div className="ab-body">
            <h2 className="ab-h2">It started with a project I couldn&rsquo;t finish</h2>
            <p className="ab-p">
              Hi, I&rsquo;m Byron. I&rsquo;ve been bouldering for a few years, and like every climber
              I&rsquo;ve had a project that shut me down. The frustrating part wasn&rsquo;t the climb.
              It was knowing the beta existed. I&rsquo;d watched someone send it. Their footage lived in
              a stranger&rsquo;s camera roll and a group chat I wasn&rsquo;t in, and by the time I
              tracked it down, the route had been reset.
            </p>
            <p className="ab-p">
              So in 2026 I started building the thing I wished existed: a place where the beta for your
              gym&rsquo;s walls lives right next to the route, for everyone, not just whoever happened
              to be standing on the mat that day.
            </p>

            <h2 className="ab-h2">Why it matters</h2>
            <p className="ab-p">
              Beta is how climbers teach each other. It&rsquo;s the conversation at the base of the wall,
              the &ldquo;try your heel here&rdquo; from a stranger, the replay of a friend&rsquo;s send.
              But gyms reset constantly, and all of that knowledge evaporates with the holds. Betabase
              keeps it with the wall: watch the beta, learn the moves, send your project, then leave
              yours behind for the next climber.
            </p>
            <p className="ab-p">
              Betabase is free for climbers, and it&rsquo;s built by one. Made for climbers, by a
              climber. If you have ideas, feedback, or a gym that should be on here, I&rsquo;d genuinely
              love to hear from you.
            </p>
          </div>
        </div>

        <CTABand />
      </main>
    </div>
  )
}
