import Link from "next/link";
import { Icon } from "./Icon";

export function Hero() {
  return (
    <section className="bb-hero" id="top">
      <div
        className="bb-hero-bg"
        style={{ backgroundImage: "url('/landing/climbing-wall-hero.png')" }}
      />
      <div className="bb-hero-grad" />
      <div className="bb-hero-inner">
        <div className="bb-eyebrow bb-eyebrow-line mb-5.5">
          A climbing beta network
        </div>
        <h1 className="bb-hero-title">
          <span className="whitespace-nowrap">
            Every gym.
            <br className="bb-hero-br-mobile" /> Every route.
          </span>
          <br />
          <span className="bb-accent-italic">Every beta.</span>
        </h1>
        <p className="bb-hero-sub">
          Find your gym, watch how the locals climbed it, and send your project.
          Community beta for every wall, every grade.
        </p>
        <div className="flex flex-col sm:flex-row gap-3.5">
          <Link
            href="/gyms"
            className="bb-btn bb-btn-primary w-full justify-center sm:w-auto"
          >
            <Icon name="search" size={18} color="var(--on-accent)" />
            Find your gym
          </Link>
          <Link
            href="/signup"
            className="bb-btn bb-btn-ghost-light w-full justify-center sm:w-auto"
          >
            <Icon name="upload" size={18} color="var(--color-chalk-100)" />
            Upload beta
          </Link>
        </div>
      </div>
      <div className="bb-hero-steps">
        <div
          className="bb-mono-label"
          style={{ color: "var(--color-plywood-400)" }}
        >
          The loop
        </div>
        <span>Watch</span>
        <span>Learn</span>
        <span>Send</span>
      </div>
      <div className="bb-scroll-hint hidden sm:block">
        <span className="bb-mono-label">Scroll</span>
        <Icon name="arrowDown" size={16} color="var(--color-chalk-100)" />
      </div>
    </section>
  );
}
