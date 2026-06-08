"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOutAction } from "@/app/(auth)/actions";
import { Avatar } from "@/components/Avatar";

// Single brand nav for the whole app. On the landing page (/) it floats
// transparent over the hero and reveals a solid blurred bar on scroll, with the
// marketing anchor links. On every other page it renders as a solid in-flow bar
// (.is-app) with just the Gyms link. Auth state mirrors the old Header: avatar +
// sign-out when signed in, Log in / Sign up otherwise. User data is fetched in
// the (server) root layout and passed down as props.
type Props = {
  username: string | null;
  avatarUrl: string | null;
  isAuthed: boolean;
};

function Logo() {
  return (
    <Link href="/" className="bb-logo">
      <Image
        className="bb-logo-mark"
        src="/landing/logo-mark.png"
        alt=""
        width={30}
        height={30}
      />
      <span>Betabase</span>
    </Link>
  );
}

// Full-viewport auth screens carry their own brand lockup, so the global nav
// must not wrap them.
const AUTH_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
]);

export function BrandNav({ username, avatarUrl, isAuthed }: Props) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isLanding) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLanding]);

  // The /admin superuser console carries its own top strip + sidebar.
  if (AUTH_ROUTES.has(pathname) || pathname.startsWith("/admin")) return null;

  const className =
    "bb-nav" + (isLanding ? (scrolled ? " is-scrolled" : "") : " is-app");

  return (
    <header className={className}>
      <Logo />
      <nav className="bb-nav-links">
        <Link href="/gyms">Gyms</Link>
        {isAuthed && <Link href="/upload">Upload</Link>}
        {isLanding && (
          <>
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#community">Community</a>
          </>
        )}
      </nav>
      <div className="bb-nav-right">
        {isAuthed ? (
          <>
            <form action={signOutAction}>
              <button type="submit" className="bb-btn bb-btn-primary bb-btn-sm">
                Sign out
              </button>
            </form>
            <Link
              href="/profile"
              className="bb-nav-login flex items-center gap-2"
            >
              <Avatar src={avatarUrl} name={username} size={28} />
              <span className="hidden sm:inline">{username}</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/login" className="bb-nav-login">
              Log in
            </Link>
            <Link
              href="/signup"
              className="bb-btn bb-btn-primary bb-btn-sm"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
