import Link from "next/link";
import { Icon } from "./Icon";
import { createClient } from "@/lib/supabase/server";

// Real featured gyms: up to 3 from Supabase with a live route count, linking to
// the gym detail page. Card photos cycle through the landing stand-in images
// (gyms have no photo field yet). Renders nothing when there are no gyms.
const CARD_IMAGES = [
  "/landing/gym-exterior.png",
  "/landing/climbing-wall-hero.png",
  "/landing/sending-climb.png",
];

type GymCardData = {
  id: string;
  name: string;
  city: string | null;
  routes: number;
  img: string;
};

function GymCard({ g }: { g: GymCardData }) {
  return (
    <Link href={`/gyms/${g.id}`} className="bb-gymcard">
      <div
        className="bb-gymcard-img"
        style={{ backgroundImage: `url('${g.img}')` }}
      >
        <div className="bb-gymcard-grad" />
        <span className="bb-gymcard-badge">
          <Icon name="layers" size={13} color="var(--color-plywood-400)" />
          {g.routes} {g.routes === 1 ? "route" : "routes"}
        </span>
      </div>
      <div className="px-5 pt-4.5 pb-5.5">
        <h3 className="bb-gymcard-name">{g.name}</h3>
        {g.city && (
          <div className="bb-gymcard-loc">
            <Icon name="mapPin" size={14} color="var(--color-plywood-400)" />
            {g.city}
          </div>
        )}
      </div>
    </Link>
  );
}

export async function FeaturedGyms() {
  const supabase = await createClient();
  const { data: gyms } = await supabase
    .from("gyms")
    .select("id, name, city")
    .order("name")
    .limit(3);

  if (!gyms || gyms.length === 0) return null;

  const cards: GymCardData[] = await Promise.all(
    gyms.map(async (gym, i) => {
      const { count } = await supabase
        .from("routes")
        .select("*", { count: "exact", head: true })
        .eq("gym_id", gym.id);
      return {
        id: gym.id,
        name: gym.name,
        city: gym.city,
        routes: count ?? 0,
        img: CARD_IMAGES[i % CARD_IMAGES.length],
      };
    }),
  );

  return (
    <section className="bg-slate-800 px-5.5 py-16 sm:px-16" id="gyms">
      <div className="mx-auto mb-12 flex max-w-300 flex-col items-start gap-4.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="bb-eyebrow">Featured gyms</div>
          <h2 className="bb-section-title">Find your home wall</h2>
        </div>
        <Link href="/gyms" className="bb-link-arrow">
          Browse all gyms{" "}
          <Icon name="arrowRight" size={16} color="var(--color-plywood-400)" />
        </Link>
      </div>
      <div className="mx-auto grid max-w-300 grid-cols-1 gap-6.5 md:grid-cols-3">
        {cards.map((g) => (
          <GymCard key={g.id} g={g} />
        ))}
      </div>
    </section>
  );
}
