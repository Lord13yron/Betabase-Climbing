import type { Metadata } from "next";
import { Playfair_Display, IBM_Plex_Mono, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { BrandNav } from "@/components/BrandNav";
import { SiteFooter } from "@/components/landing/SiteFooter";

// Brand type system (replaces Geist). Exposed as CSS variables that globals.css
// maps onto --font-display / --font-mono / --font-ui (and --font-sans).
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Betabase — Community beta for every climbing gym",
  description:
    "Find your gym, watch how the locals climbed it, and send your project. Community beta for every wall, every grade.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Auth state for the nav (previously lived in <Header>). The nav itself is a
  // client component for scroll/pathname behavior, so it takes this as props.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username: string | null = null;
  let avatarUrl: string | null = null;
  let isAdmin = false;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url, is_admin")
      .eq("id", user.id)
      .single();
    username = data?.username ?? null;
    avatarUrl = data?.avatar_url ?? null;
    isAdmin = data?.is_admin === true;
  }

  return (
    <html
      lang="en"
      className={`${playfair.variable} ${plexMono.variable} ${hanken.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <BrandNav
          username={username}
          avatarUrl={avatarUrl}
          isAuthed={!!user}
          isAdmin={isAdmin}
        />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
