"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { classnames } from "@/lib/format";

const LINKS = [
  { href: "/events", label: "Fight Cards" },
  { href: "/fighters", label: "Fighters" },
  { href: "/simulator", label: "Simulator" },
  { href: "/betting", label: "Betting" },
  { href: "/research", label: "Research" },
  { href: "/pricing", label: "Pricing" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={classnames(
                  "rounded-md px-3 py-2 text-sm font-medium uppercase tracking-wide transition-colors",
                  active ? "text-blood" : "text-muted hover:text-fg"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className="text-sm font-medium text-muted hover:text-fg">Log in</Link>
          <Link href="/pricing" className="rounded-md bg-blood px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-blood-dim">
            Get Pro
          </Link>
        </div>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-md border border-line text-fg lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <div className="space-y-1.5">
            <span className={classnames("block h-0.5 w-5 bg-fg transition", open && "translate-y-2 rotate-45")} />
            <span className={classnames("block h-0.5 w-5 bg-fg transition", open && "opacity-0")} />
            <span className={classnames("block h-0.5 w-5 bg-fg transition", open && "-translate-y-2 -rotate-45")} />
          </div>
        </button>
      </div>
      {open && (
        <nav className="border-t border-line bg-bg px-4 pb-4 lg:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block border-b border-line-soft py-3 text-sm font-medium uppercase tracking-wide text-muted hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-4 flex gap-3">
            <Link href="/login" onClick={() => setOpen(false)} className="flex-1 rounded-md border border-line py-2 text-center text-sm">Log in</Link>
            <Link href="/pricing" onClick={() => setOpen(false)} className="flex-1 rounded-md bg-blood py-2 text-center text-sm font-semibold text-white">Get Pro</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
