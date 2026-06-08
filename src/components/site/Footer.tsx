"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

const COLS = [
  {
    title: "Product",
    links: [
      { href: "/predict", label: "Predictions" },
      { href: "/free-pick", label: "Free Pick of the Week" },
      { href: "/upsets", label: "Upset Radar" },
      { href: "/play", label: "Pick'em vs AI" },
      { href: "/simulator", label: "AI Simulator" },
      { href: "/betting", label: "Betting Intelligence" },
      { href: "/events", label: "Events" },
      { href: "/fighters", label: "Fighters" },
      { href: "/compare", label: "Compare Fighters" },
      { href: "/research", label: "News" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/about", label: "About FightVex" },
      { href: "/pricing", label: "Pricing" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/methodology", label: "Methodology" },
      { href: "/accuracy", label: "Accuracy Record" },
      { href: "/faq", label: "FAQ" },
      { href: "/glossary", label: "Glossary" },
    ],
  },
  {
    title: "Trust & Legal",
    links: [
      { href: "/security", label: "Security & Trust" },
      { href: "/responsible-gambling", label: "Responsible Gambling" },
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/affiliate-disclosure", label: "Affiliate Disclosure" },
    ],
  },
];

export function Footer() {
  // On the homepage the footer is a full-screen "tab" the hero scrolls into,
  // so it fills the viewport and its content is vertically centered.
  const isHome = usePathname() === "/";
  return (
    <footer
      className={`border-t border-line bg-panel/40 ${
        isHome ? "lg:flex lg:min-h-screen lg:flex-col lg:justify-center" : "mt-24"
      }`}
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted">
              AI-powered combat-sports intelligence. Backtested, transparent simulations — every pick timestamped in Bitcoin before the fight — for serious MMA fans and bettors.
            </p>
            <p className="mt-4 text-[11px] uppercase tracking-wider text-faint">
              Not affiliated with or endorsed by any MMA promotion or sportsbook.
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-fg">{c.title}</h4>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted hover:text-fg">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-lg border border-line bg-bg/60 p-4">
          <p className="text-[11px] leading-relaxed text-muted">
            <span className="font-semibold text-amber">21+ · Please gamble responsibly.</span>{" "}
            FightVex provides informational analytics and probabilistic research tools for entertainment. We do not accept wagers, and nothing here is betting or financial advice or a guarantee of any outcome. Fighter identities, records, rankings, fight history and odds are real data sourced from public providers (ESPN, official rankings, market odds); the only modelled figures are the clearly-labeled Vex AI simulations. If gambling is affecting you or someone you know, call 1-800-GAMBLER (US) or contact your local support service. Features and availability vary by region and local law.
          </p>
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-2 text-xs text-faint sm:flex-row">
          <p>© 2026 FightVex. All rights reserved.</p>
          <p>Built as a product demonstration.</p>
        </div>
      </div>
    </footer>
  );
}
