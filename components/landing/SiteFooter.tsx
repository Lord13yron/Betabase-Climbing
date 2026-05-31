import Link from "next/link";
import Image from "next/image";
import { Icon } from "./Icon";

const COLS: { h: string; links: [string, string][] }[] = [
  {
    h: "Product",
    links: [
      ["Find a gym", "/gyms"],
      ["How it works", "#how"],
      ["Upload beta", "/signup"],
      ["For gyms", "#"],
    ],
  },
  {
    h: "Community",
    links: [
      ["Top climbers", "#"],
      ["Recent sends", "#"],
      ["Leaderboards", "#"],
      ["Blog", "#"],
    ],
  },
  {
    h: "Company",
    links: [
      ["About", "#"],
      ["Careers", "#"],
      ["Contact", "#"],
      ["Privacy", "#"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mx-auto grid max-w-[1312px] grid-cols-1 gap-[60px] border-t border-[var(--hairline-soft)] px-[56px] pt-[80px] pb-[40px] md:grid-cols-[1.4fr_2fr]">
      <div>
        <Link href="/" className="bb-logo">
          <Image className="bb-logo-mark" src="/landing/logo-mark.png" alt="" width={30} height={30} />
          <span>Betabase</span>
        </Link>
        <p className="bb-footer-tag">
          Watch. Learn. Send.
          <br />
          Community beta for every climbing gym.
        </p>
        <div className="bb-footer-social flex gap-[14px]">
          <a href="#" aria-label="Instagram">
            <Icon name="instagram" size={18} color="var(--color-slate-300)" />
          </a>
          <a href="#" aria-label="X">
            <Icon name="x" size={18} color="var(--color-slate-300)" />
          </a>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-[30px] md:grid-cols-3">
        {COLS.map((c) => (
          <div className="bb-footer-col flex flex-col gap-[14px]" key={c.h}>
            <div className="bb-mono-label mb-[4px]">{c.h}</div>
            {c.links.map(([label, href]) => (
              <Link href={href} key={label}>
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="col-span-full mt-[20px] flex justify-between border-t border-[var(--hairline-soft)] pt-[34px]">
        <span className="bb-mono">© 2026 Betabase, Inc.</span>
        <span className="bb-mono">Made for climbers, by climbers.</span>
      </div>
    </footer>
  );
}
