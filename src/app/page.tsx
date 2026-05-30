import Link from "next/link";
import { nextEvent } from "@/lib/data/events";
import { allFighters, getFighterById } from "@/lib/data/fighters";
import { allInsights } from "@/lib/data/research";
import { simulate } from "@/lib/sim";
import { Countdown } from "@/components/fight/Countdown";
import { MatchupRow } from "@/components/fight/MatchupRow";
import { FighterCard } from "@/components/fighter/FighterCard";
import { SectionHeading } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { ProbBar } from "@/components/ui/ProbBar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { lastName } from "@/lib/format";

export default function Home() {
  const event = nextEvent();
  const main = event.matchups.filter((m) => m.isMain).slice(0, 3);
  const featured = event.matchups[0];
  const fa = getFighterById(featured.fighterA)!;
  const fb = getFighterById(featured.fighterB)!;
  const featSim = simulate(fa, fb, { rounds: featured.rounds, runs: 800 });
  const fighters = allFighters().filter((f) => f.champion || (f.ranking ?? 9) <= 3).slice(0, 4);
  const insights = allInsights().slice(0, 3);

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="bg-cage spotlight absolute inset-0 opacity-90" />
        <div className="absolute inset-0">
          <div className="animate-streak absolute left-0 top-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-blood to-transparent" />
          <div className="animate-streak absolute right-0 top-2/3 h-px w-1/3 bg-gradient-to-r from-transparent via-edge to-transparent" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-3xl">
            <div className="animate-rise">
              <Badge variant="blood">AI MMA Fight Intelligence</Badge>
            </div>
            <h1 className="animate-rise delay-1 mt-5 font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-7xl">
              Read the fight
              <br />
              <span className="text-gradient-blood">before it happens.</span>
            </h1>
            <p className="animate-rise delay-2 mt-6 max-w-xl text-lg text-muted">
              Deep fighter analytics, transparent AI simulations and real-time odds
              intelligence for serious MMA bettors. Every stat weighted. Every
              prediction explained. Probabilities, not promises.
            </p>
            <div className="animate-rise delay-3 mt-8 flex flex-wrap gap-3">
              <Link href="/events" className="rounded-md bg-blood px-6 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-blood-dim glow-blood">
                Explore the Next Card
              </Link>
              <Link href="/simulator" className="rounded-md border border-line bg-panel px-6 py-3 text-sm font-bold uppercase tracking-wide text-fg hover:border-steel">
                Run a Simulation
              </Link>
            </div>
            <p className="animate-fade delay-4 mt-6 text-[11px] uppercase tracking-widest text-faint">
              21+ · For entertainment &amp; research · Not betting advice · No guaranteed outcomes
            </p>
          </div>

          <div className="animate-rise delay-5 mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: "Fighters tracked", v: "40+ metrics" },
              { k: "Model", v: "v1.3 · calibrated" },
              { k: "Monte Carlo", v: "up to 5k runs" },
              { k: "Data sources", v: "licensed only" },
            ].map((s) => (
              <div key={s.k} className="panel rounded-lg p-4">
                <p className="font-display text-xl font-bold text-fg">{s.v}</p>
                <p className="text-[11px] uppercase tracking-wider text-muted">{s.k}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ NEXT EVENT STRIP ============ */}
      <section className="border-b border-line bg-panel/30">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-8 sm:px-6 lg:flex-row">
          <div>
            <Badge variant="blood">Next Event</Badge>
            <h2 className="mt-2 font-display text-2xl font-bold uppercase sm:text-3xl">{event.name}</h2>
            <p className="mt-1 text-sm text-muted">
              {new Date(event.date).toUTCString().slice(0, 16)} · {event.venue}, {event.city} · {event.broadcast}
            </p>
          </div>
          <Countdown iso={event.date} />
          <Link href={`/events/${event.slug}`} className="rounded-md border border-line bg-panel px-5 py-2.5 text-sm font-semibold uppercase tracking-wide hover:border-steel">
            Full Card →
          </Link>
        </div>
      </section>

      {/* ============ FEATURED MATCHUP ============ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading kicker="Main Event Breakdown" title="Featured Matchup" />
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="panel rounded-xl p-6">
            <ProbBar probA={featSim.probA} labelA={lastName(fa.name)} labelB={lastName(fb.name)} ciLow={featSim.ciLow} ciHigh={featSim.ciHigh} />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-blood/30 bg-blood/5 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blood">Why {lastName(fa.name)} can win</p>
                <ul className="space-y-1 text-sm text-muted">
                  {fa.strengths.slice(0, 3).map((s) => (<li key={s}>• {s}</li>))}
                </ul>
              </div>
              <div className="rounded-lg border border-edge/30 bg-edge/5 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-edge">Why {lastName(fb.name)} can win</p>
                <ul className="space-y-1 text-sm text-muted">
                  {fb.strengths.slice(0, 3).map((s) => (<li key={s}>• {s}</li>))}
                </ul>
              </div>
            </div>
            <div className="mt-4">
              <Disclaimer />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Key matchup factors</p>
            {featured.keyFactors.map((k) => (
              <div key={k} className="panel rounded-lg p-3 text-sm text-fg">
                <span className="mr-2 text-blood">▸</span>{k}
              </div>
            ))}
            <Link href={`/simulator?a=${fa.id}&b=${fb.id}`} className="block rounded-md bg-blood px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-white hover:bg-blood-dim">
              Simulate this fight →
            </Link>
          </div>
        </div>
      </section>

      {/* ============ MAIN CARD PREVIEW ============ */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SectionHeading kicker="Fight Card" title="Main Card" action={<Link href={`/events/${event.slug}`} className="text-sm font-semibold text-blood hover:underline">View all →</Link>} />
        <div className="space-y-4">
          {main.map((m) => (<MatchupRow key={m.id} matchup={m} />))}
        </div>
      </section>

      {/* ============ FIGHTERS SHOWCASE ============ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading kicker="Fighter Analytics" title="Top Ranked" action={<Link href="/fighters" className="text-sm font-semibold text-blood hover:underline">Full database →</Link>} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {fighters.map((f) => (<FighterCard key={f.id} fighter={f} />))}
        </div>
      </section>

      {/* ============ RESEARCH FEED ============ */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SectionHeading kicker="AI Research Engine" title="Latest Intelligence" action={<Link href="/research" className="text-sm font-semibold text-blood hover:underline">Full feed →</Link>} />
        <div className="grid gap-4 md:grid-cols-3">
          {insights.map((i) => (
            <div key={i.id} className="panel panel-hover rounded-xl p-4">
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="steel">{i.type}</Badge>
                <span className="text-[10px] text-muted">{i.recency}</span>
              </div>
              <h3 className="font-display text-base font-bold leading-tight text-fg">{i.headline}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted">{i.summary}</p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-[10px] text-muted">
                <span>{i.source}</span>
                <span className="text-edge">Conf: {i.confidence}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ WHY / TRUST ============ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="panel bg-cage-fine rounded-2xl p-8 sm:p-12">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { t: "Depth", d: "40+ tracked metrics per fighter, opponent-quality ratings, and AI style breakdowns most platforms never surface." },
              { t: "Transparency", d: "Every model weight is published. Explainable factor contributions show exactly what moved each prediction." },
              { t: "Honesty", d: "Probability ranges, calibrated confidence, and uncertainty inflation. We never sell guaranteed picks." },
            ].map((c) => (
              <div key={c.t}>
                <div className="mb-3 inline-block h-1 w-10 bg-blood" />
                <h3 className="font-display text-xl font-bold uppercase">{c.t}</h3>
                <p className="mt-2 text-sm text-muted">{c.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/methodology" className="rounded-md border border-line px-5 py-2.5 text-sm font-semibold uppercase tracking-wide hover:border-steel">How our model works</Link>
            <Link href="/pricing" className="rounded-md bg-blood px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-blood-dim">See plans</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
