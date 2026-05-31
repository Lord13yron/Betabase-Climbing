const STEPS = [
  {
    n: "01",
    t: "Find your gym",
    d: "Search the directory by name or city, favorite your home gym, and pull up every wall and route it's got.",
  },
  {
    n: "02",
    t: "Browse or upload beta",
    d: "Watch community beta videos for any route — the exact sequence, the heel hook, the crux — or film and tag your own.",
  },
  {
    n: "03",
    t: "Send your project",
    d: "Use the knowledge, crush the crux, and log the send. Give back so the next climber finds their way up too.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-slate-800 px-[56px] pt-[120px] pb-[110px]" id="how">
      <div className="mx-auto mb-[80px] max-w-[1200px]">
        <div className="bb-eyebrow">How it works</div>
        <h2 className="bb-how-title">
          Watch. Learn.
          <br />
          <span className="bb-accent-italic">Send.</span>
        </h2>
      </div>
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div className="bb-step" key={s.n}>
            {i > 0 && <div className="bb-step-rule" />}
            <div className="bb-step-num-sm">{s.n}</div>
            <div className="bb-step-ghost">{s.n}</div>
            <h3 className="bb-step-title">{s.t}</h3>
            <p className="bb-step-desc">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
