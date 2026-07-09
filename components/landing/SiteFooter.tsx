"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

// Auth screens are full-viewport and carry their own chrome, so the global
// footer must not render on them.
const AUTH_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
]);

const COLS: { h: string; links: [string, string][] }[] = [
  {
    h: "Product",
    links: [
      ["Find a gym", "/gyms"],
      ["Upload beta", "/upload"],
    ],
  },
  {
    h: "Community",
    links: [
      ["About", "/about"],
      ["Recent sends", "/profile"],
    ],
  },
  {
    h: "Company",
    links: [
      ["Contact", "/contact"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ],
  },
];

export function SiteFooter() {
  const pathname = usePathname();
  // The /admin console is a self-contained app surface — no marketing footer.
  if (AUTH_ROUTES.has(pathname) || pathname.startsWith("/admin")) return null;

  return (
    <footer className="bg-(--color-slate-900) border-t border-(--hairline-soft)">
      <div className="mx-auto grid max-w-328 grid-cols-1 gap-15 px-5.5 pt-20 pb-10 sm:px-14 md:grid-cols-[1.4fr_2fr]">
        <div>
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
          <p className="bb-footer-tag">
            Watch. Learn. Send.
            <br />
            Community beta for every climbing gym.
          </p>
          <div className="bb-footer-social flex gap-3.5">
            <a href="#" aria-label="Instagram">
              <Icon name="instagram" size={18} color="var(--color-slate-300)" />
            </a>
            <a href="#" aria-label="X">
              <Icon name="x" size={18} color="var(--color-slate-300)" />
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-7.5 md:grid-cols-3">
          {COLS.map((c) => (
            <div className="bb-footer-col flex flex-col gap-3.5" key={c.h}>
              <div className="bb-mono-label mb-1">{c.h}</div>
              {c.links.map(([label, href]) => (
                <Link href={href} key={label}>
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="col-span-full mt-5 flex flex-col gap-2.5 border-t border-(--hairline-soft) pt-8.5 sm:flex-row sm:justify-between">
          <span className="bb-mono">© 2026 Betabase</span>
          <span className="bb-mono">Made for climbers, by climbers.</span>
        </div>
      </div>
    </footer>
  );
}
