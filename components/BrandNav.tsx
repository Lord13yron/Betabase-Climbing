"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  isAdmin: boolean;
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

export function BrandNav({ username, avatarUrl, isAuthed, isAdmin }: Props) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isLanding) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLanding]);

  // Collapse the mobile menu on navigation.
  useEffect(() => setMenuOpen(false), [pathname]);

  // While open, close on Escape or a pointer down outside the bar.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [menuOpen]);

  if (AUTH_ROUTES.has(pathname)) return null;

  const className =
    "bb-nav" + (isLanding ? (scrolled ? " is-scrolled" : "") : " is-app");

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={className} ref={headerRef}>
      <Logo />
      <div className={"bb-nav-collapse" + (menuOpen ? " is-open" : "")}>
        <nav className="bb-nav-links">
          <Link href="/gyms" onClick={closeMenu}>
            Gyms
          </Link>
          <Link href="/community" onClick={closeMenu}>
            Community
          </Link>
          <Link href="/upload" onClick={closeMenu}>
            Upload
          </Link>
          {isAdmin && (
            <Link href="/admin" onClick={closeMenu}>
              Admin
            </Link>
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
                onClick={closeMenu}
                className="bb-nav-login flex items-center gap-2"
              >
                <Avatar src={avatarUrl} name={username} size={28} />
                <span className="bb-nav-username">{username}</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" onClick={closeMenu} className="bb-nav-login">
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={closeMenu}
                className="bb-btn bb-btn-primary bb-btn-sm"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        className="bb-nav-burger"
        aria-label="Menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        {menuOpen ? (
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </header>
  );
}
