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
    title: "The whole gym,\nfiltered your way",
    body: "Pull up a gym's full route list and slice it by grade, hold color, climb type, and wall. Boulder problems on the V-scale, ropes on YDS — always current with the latest set.",
    img: "/landing/outside-gym.png",
    flip: true,
    meta: ["GRADE", "COLOR", "TYPE", "WALL"],
  },
  {
    n: "02",
    kicker: "Beta video",
    title: "See exactly\nhow it's done",
    body: "Every route has its own gallery of community beta. Watch the sequence move-by-move in crisp, fast-loading video, then add your own send to show the next climber a different way up.",
    img: "/landing/filming-climb.png",
    flip: false,
    meta: ["WATCH", "UPLOAD", "COMMENT"],
  },
  {
    n: "03",
    kicker: "Your profile",
    title: "Track every\nsend you log",
    body: "Tick a send, favorite the climbs you're projecting, and build a profile that shows your max boulder and route grades. Follow other climbers and see what they're sending.",
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
    <section className="bg-slate-900 px-5.5 py-16 sm:px-16" id="features">
      <div className="mx-auto max-w-300">
        {FEATURES.map((f) => (
          <FeatureRow key={f.n} f={f} />
        ))}
      </div>
    </section>
  );
}
