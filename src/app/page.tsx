import Image from "next/image";
import Link from "next/link";
import { nextEvent } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import { simulate } from "@/lib/sim";
import { RelatedNews } from "@/components/live/RelatedNews";
import { MatchupRow } from "@/components/fight/MatchupRow";
import { lastName, recordString, pct, fmtOdds, bestPrice, signClass } from "@/lib/format";
import { HeroFightAnimation } from "@/components/site/HeroFightAnimation";
import { HeroKeyFactors } from "@/components/site/HeroKeyFactors";

// Revalidate hourly so the rolling "next event" hero advances after a card
// passes (Date.now() is only re-evaluated when the page regenerates).
export const revalidate = 3600;

export default function Home() {
  const event = nextEvent();
  const main = event.matchups.filter((m) => m.isMain).slice(0, 3);
  const featured = event.matchups[0];
  const fa = getFighterById(featured.fighterA)!;
  const fb = getFighterById(featured.fighterB)!;
  const featSim = simulate(fa, fb, { rounds: featured.rounds, runs: 800, shortNoticeA: featured.shortNoticeA, shortNoticeB: featured.shortNoticeB });

  // Real info for the MATCH 2 hero tab — the featured event matchup.
  const featBestA = bestPrice(featured.odds.map((o) => o.priceA));
  const featBestB = bestPrice(featured.odds.map((o) => o.priceB));
  const featWinner = featSim.probA >= featSim.probB ? fa : fb;
  const featConf = Math.max(featSim.probA, featSim.probB);
  const featWinnerOdds = featWinner === fa ? featBestA : featBestB;

  // Real, data-driven numbers for the hero match-2 (Muhammad vs Bonfim) showcase.
  const abbrev = (n: string) => `${n.charAt(0)}. ${lastName(n)}`;
  const clamp01 = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const strikeTrend = (slpm: number, primary: boolean) => {
    const v = Math.round(clamp01(slpm * 13, 22, 100));
    return primary
      ? [Math.round(v * 0.55), Math.round(v * 0.82), Math.round(v * 0.72), v, Math.round(v * 0.9)]
      : [Math.round(v * 0.5), Math.round(v * 0.46), Math.round(v * 0.62), Math.round(v * 0.56), Math.round(v * 0.5)];
  };
  const match2Stats = {
    winner: abbrev(featWinner.name),
    winnerPct: Math.round(featConf * 100),
    confidence: `${clamp01(6 + (featConf - 0.5) * 8, 5.5, 9.5).toFixed(1)}/10`,
    aStrAcc: fa.stats.strAcc,
    aTdDef: fa.stats.tdDef,
    bStrAcc: fb.stats.strAcc,
    bTdDef: fb.stats.tdDef,
    s1: strikeTrend(fa.stats.slpm, true),
    s2: strikeTrend(fb.stats.slpm, false),
    sigDelta: Math.max(1, Math.round(Math.abs(fa.stats.slpm - fb.stats.slpm) * 10)),
  };

  // Same fonts/classes as the Bet Smarter block — just real matchup content.
  const match2Info = (
    <div data-hero-scroll className="max-h-[calc(100svh-1rem)] max-w-[520px] overflow-y-auto overscroll-contain pb-10 pt-20 sm:pt-16 lg:max-h-none lg:overflow-visible lg:pt-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blood">
        {featured.isTitle ? "Title Bout" : "Main Event"} · {event.name}
      </p>
      <h2 className="mt-2 font-display text-4xl font-black uppercase italic leading-[0.92] tracking-tight sm:text-6xl lg:text-[72px]">
        <span className="title-silver">{lastName(fa.name)}</span><br />
        <span className="whitespace-nowrap italic text-blood">vs {lastName(fb.name)}.</span>
      </h2>
      <p className="mt-4 max-w-[400px] text-sm leading-relaxed text-muted sm:text-base">
        {fa.name} ({recordString(fa.record)}) meets {fb.name} ({recordString(fb.record)}) in the{" "}
        {featured.weightClass} {featured.rounds}-round {featured.isMain ? "main event" : "bout"}. Vex AI
        favors {lastName(featWinner.name)} at {pct(featConf)}.
      </p>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link href={`/events/${event.slug}#${featured.id}`} className="btn-flare flex items-center gap-2 rounded-md px-6 py-3 text-sm font-bold uppercase tracking-wide">
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden><path d="M1 1l8 5-8 5V1z"/></svg>
          View Matchup
        </Link>
        <Link href={`/compare?a=${fa.slug}&b=${fb.slug}`} className="rounded-md border border-line bg-transparent px-6 py-3 text-sm font-bold uppercase tracking-wide text-fg hover:border-steel">
          Compare
        </Link>
      </div>
      <HeroKeyFactors factors={featured.keyFactors.slice(0, 4)} />
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { v: recordString(fa.record), l: `${lastName(fa.name)} Record`, c: "text-fg" },
          { v: recordString(fb.record), l: `${lastName(fb.name)} Record`, c: "text-fg" },
          { v: pct(featConf), l: "AI Confidence", c: "text-fg" },
          { v: fmtOdds(featWinnerOdds), l: `${lastName(featWinner.name)} Best Price`, c: signClass(featWinnerOdds) },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-line/60 bg-bg/70 px-3 py-3 backdrop-blur-sm">
            <p className={`font-display text-xl font-bold ${s.c}`}>{s.v}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">{s.l}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[10px] uppercase tracking-widest text-faint">
        Probabilities are Vex AI estimates. 21+ · Not betting advice.
      </p>
    </div>
  );

  return (
    <div className="metal-titles">
      {/* SEO: the root URL needs one descriptive H1 (the hero copy is all H2). */}
      <h1 className="sr-only">FightVex — AI UFC Fight Simulator, Predictions &amp; Betting Tools</h1>
      {/* Single fixed octagon bg — persists behind hero AND all scroll sections.
          The opaque bg base covers the full viewport so the global animated
          flare (a separate fixed layer) is hidden on the home page: the octagon
          backdrop is this page's own ambiance, and letting the flare show only
          on the left half left a hard vertical seam at the octagon's edge. The
          flare still animates on every other (plain-background) page. */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-bg">
        <div className="absolute right-0 top-0 h-full w-[65%]">
          <Image src="/bg-octagon.jpg" alt="" fill className="object-cover object-center opacity-40" sizes="65vw" priority />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, var(--color-bg) 0%, color-mix(in srgb, var(--color-bg) 40%, transparent) 40%, transparent 100%)" }} />
        </div>
      </div>

      {/* Single pinned stage: the hero (Bet Smarter + fighters) and these
          sections share ONE background; each section replaces the previous in
          the same left region as you scroll. */}
      <HeroFightAnimation match2Info={match2Info} match2={match2Stats} sections={[

        /* ── 1: Fight Card ── */
        <div key="fight-card" className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blood">Fight Card</p>
            <h2 className="mt-1 font-display text-4xl font-bold uppercase sm:text-5xl">Main Card</h2>
          </div>
          <div className="space-y-3">
            {main.map((m) => <MatchupRow key={m.id} matchup={m} />)}
          </div>
          <Link href={`/events/${event.slug}`} className="inline-block text-sm font-semibold text-blood hover:underline">
            View full card →
          </Link>
        </div>,

        /* ── 4: Latest Intelligence — REAL ESPN news ── */
        <div key="research" className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blood">UFC News · ESPN</p>
            <h2 className="mt-1 font-display text-4xl font-bold uppercase sm:text-5xl">Latest Intelligence</h2>
          </div>
          <RelatedNews limit={4} />
          <Link href="/research" className="inline-block text-sm font-semibold text-blood hover:underline">
            Full feed →
          </Link>
        </div>,

      ]} />
    </div>
  );
}
