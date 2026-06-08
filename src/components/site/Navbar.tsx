"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { classnames } from "@/lib/format";
import { useAuth } from "@/components/auth/AuthProvider";

// Plan mark in the nav corner: red fist for Elite, blue fist for Pro
// (public/plan-elite.png / public/plan-pro.png). Falls back to a coloured
// text badge if the image is missing, so it never shows a broken icon.
function PlanMark() {
  const [ok, setOk] = useState(true);
  if (!ok)
    return (
      <span className="rounded-md border border-blue px-3 py-2 text-sm font-semibold uppercase tracking-wide text-blue">
        Pro
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/plan-pro.png"
      alt="Pro plan"
      title="Pro plan"
      width={34}
      height={34}
      className="h-[34px] w-[34px] object-contain"
      onError={() => setOk(false)}
    />
  );
}

const LINKS = [
  { href: "/events", label: "Events" },
  { href: "/predict", label: "Predictions" },
  { href: "/free-pick", label: "Free Pick" },
  { href: "/fighters", label: "Fighters" },
  { href: "/simulator", label: "Simulator" },
  { href: "/betting", label: "Bet" },
  { href: "/research", label: "News" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="flex h-16 w-full items-center justify-between pl-4 pr-4 sm:pl-6 sm:pr-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={classnames(
                  "rounded-md px-3 py-2 text-sm uppercase tracking-wide transition-colors",
                  active ? "font-semibold text-fg" : "font-medium text-muted hover:text-fg"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {loading ? null : user ? (
            <>
              <Link href="/account" className="text-sm font-medium text-muted hover:text-fg">{user.name.split(" ")[0] || "Account"}</Link>
              {user.plan !== "free" ? (
                <PlanMark />
              ) : (
                <Link href="/pricing" className="btn-flare rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wide">
                  Get Pro
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-muted hover:text-fg">Log in</Link>
              <Link href="/pricing" className="btn-flare rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wide">
                Get Pro
              </Link>
            </>
          )}
          {/* Theme toggle sits to the right of the Get Pro / account actions. */}
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            className="flex h-10 w-10 items-center justify-center rounded-md border border-line text-fg"
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
            {user ? (
              <>
                <Link href="/account" onClick={() => setOpen(false)} className="flex-1 rounded-md border border-line py-2 text-center text-sm">Account</Link>
                <Link href="/pricing" onClick={() => setOpen(false)} className="btn-flare flex-1 rounded-md py-2 text-center text-sm font-semibold">{user.plan !== "free" ? "Pro" : "Get Pro"}</Link>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="flex-1 rounded-md border border-line py-2 text-center text-sm">Log in</Link>
                <Link href="/pricing" onClick={() => setOpen(false)} className="btn-flare flex-1 rounded-md py-2 text-center text-sm font-semibold">Get Pro</Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
