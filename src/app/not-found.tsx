import Link from "next/link";
import Image from "next/image";

// 404 — the art is a clean photo (no baked-in buttons), so the heading and
// navigation are real, legible UI in our house style.
export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-2xl place-items-center px-4 py-10 sm:px-6">
      <div className="w-full text-center">
        <div className="relative mx-auto aspect-[3/2] w-full overflow-hidden rounded-2xl border border-line">
          <Image src="/404.png" alt="A knocked-out fighter being checked by the referee" fill priority sizes="(max-width: 640px) 100vw, 640px" className="object-cover" />
          {/* Scrim fades the photo into the page background for a clean blend. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/15 to-transparent" />
          <span className="absolute left-1/2 top-3 -translate-x-1/2 font-display text-6xl font-black tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)] sm:text-7xl">
            404
          </span>
        </div>

        <h1 className="mt-6 font-display text-3xl font-bold uppercase sm:text-4xl">This page got knocked out</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">
          The page you&apos;re looking for didn&apos;t beat the count — it&apos;s not here. Let&apos;s get you back to the action.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-flare rounded-md px-6 py-3 text-sm font-bold uppercase tracking-wide">
            Back to home
          </Link>
          <Link href="/simulator" className="rounded-md border border-line bg-panel px-6 py-3 text-sm font-semibold uppercase tracking-wide text-fg transition-colors hover:border-steel">
            AI Simulator
          </Link>
          <Link href="/fighters" className="rounded-md border border-line bg-panel px-6 py-3 text-sm font-semibold uppercase tracking-wide text-fg transition-colors hover:border-steel">
            Fighters
          </Link>
        </div>
        <p className="mt-4 text-[11px] text-faint">
          Think this is a mistake? <a href="mailto:support@fightvex.com" className="text-blood hover:underline">Contact support</a>.
        </p>
      </div>
    </div>
  );
}
