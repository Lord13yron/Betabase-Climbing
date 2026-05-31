import Link from "next/link";
import { Icon } from "./Icon";

export function CTABand() {
  return (
    <section className="bb-cta px-5.5 sm:px-14 py-30 text-center" id="community">
      <div className="mx-auto max-w-155">
        <div className="bb-eyebrow" style={{ color: "var(--on-accent)" }}>
          Join the community
        </div>
        <h2 className="bb-cta-title">
          Ready to send
          <br />
          your project?
        </h2>
        <p className="bb-cta-sub">
          Free for climbers. Find your gym and start watching beta today.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3.5">
          <Link href="/signup" className="bb-btn bb-btn-ink w-full justify-center sm:w-auto">
            <Icon name="user" size={18} color="var(--color-chalk-50)" />
            Sign up free
          </Link>
          <Link href="/gyms" className="bb-btn bb-btn-ghost-chalk w-full justify-center sm:w-auto">
            <Icon name="search" size={18} color="var(--color-slate-800)" />
            Find your gym
          </Link>
        </div>
      </div>
    </section>
  );
}
