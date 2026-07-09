type Feature = {
  n: string;
  kicker: string;
  title: string;
  body: string;
  img: string;
  flip: boolean;
  meta: string[];
};

const FEATURES: Feature[] = [
  {
    n: "01",
    kicker: "Every route",
    title: "Find your gym",
    body: "Search the directory by name or city, favorite your home gym, and pull up every wall and route it's got.",
    img: "/landing/outside-gym.png",
    flip: true,
    meta: ["GRADE", "COLOR", "TYPE", "WALL"],
  },
  {
    n: "02",
    kicker: "All the Beta",
    title: "Browse or upload beta",
    body: "Watch community beta videos for any route — the exact sequence, the heel hook, the crux — or film and tag your own.",
    img: "/landing/filming-climb.png",
    flip: false,
    meta: ["WATCH", "UPLOAD", "COMMENT"],
  },
  {
    n: "03",
    kicker: "Log your sends",
    title: "Send your project",
    body: "Use the knowledge, crush the crux, and log the send. Give back so the next climber finds their way up too.",
    img: "/landing/sending-climb.png",
    flip: true,
    meta: ["SENDS", "PROJECTS", "MAX GRADE"],
  },
];

function FeatureRow({ f }: { f: Feature }) {
  return (
    <div className="grid grid-cols-1 items-center gap-7.5 py-10 md:grid-cols-2 md:gap-20 md:py-15">
      <div className={f.flip ? "md:order-2" : ""}>
        <div
          className="bb-feature-img"
          style={{ backgroundImage: `url('${f.img}')` }}
        />
      </div>
      <div className="relative">
        <div className="bb-feature-ghost">{f.n}</div>
        <div className="bb-eyebrow bb-eyebrow-line">{f.kicker}</div>
        <h3 className="bb-feature-title">{f.title}</h3>
        <p className="bb-feature-body">{f.body}</p>
        <div className="flex flex-wrap gap-2">
          {f.meta.map((m) => (
            <span className="bb-chip" key={m}>
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section className="bg-slate-800 px-5.5 py-14 sm:px-14" id="features">
      <div className="mx-auto mb-20 max-w-300">
        <div className="bb-eyebrow">How it works</div>
        <h2 className="bb-how-title">
          Watch. Learn.
          <br />
          <span className="bb-accent-italic">Send.</span>
        </h2>
      </div>
      <div className="mx-auto max-w-300">
        {FEATURES.map((f) => (
          <FeatureRow key={f.n} f={f} />
        ))}
      </div>
    </section>
  );
}
