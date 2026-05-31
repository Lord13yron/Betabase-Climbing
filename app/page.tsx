import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { FeaturedGyms } from "@/components/landing/FeaturedGyms";
import { CTABand } from "@/components/landing/CTABand";
import { SiteFooter } from "@/components/landing/SiteFooter";

// The nav lives in the root layout (BrandNav), so it's not rendered here.
// .bb-landing scopes the dark brand palette to this page only.
export default function Home() {
  return (
    <main className="bb-landing">
      <Hero />
      <HowItWorks />
      <Features />
      <FeaturedGyms />
      <CTABand />
      <SiteFooter />
    </main>
  );
}
