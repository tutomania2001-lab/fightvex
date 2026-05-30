import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/site/Logo";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 sm:px-6">
      <Logo />
      <div className="panel bg-cage-fine mt-8 w-full rounded-2xl p-8">
        <h1 className="font-display text-2xl font-bold uppercase">Log in</h1>
        <p className="mt-1 text-sm text-muted">Demo screen — authentication is not wired up.</p>
        <div className="mt-6 space-y-3">
          <input type="email" placeholder="Email" className="w-full rounded-md border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-blood" />
          <input type="password" placeholder="Password" className="w-full rounded-md border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-blood" />
          <button className="w-full rounded-md bg-blood py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-blood-dim">Continue</button>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted">21+ · By continuing you accept our <Link href="/legal/terms" className="text-blood underline">Terms</Link>.</p>
      </div>
      <Link href="/" className="mt-6 text-sm text-muted hover:text-fg">← Back home</Link>
    </div>
  );
}
