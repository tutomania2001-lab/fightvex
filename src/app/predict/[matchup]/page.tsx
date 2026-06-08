import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { allEvents } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import { simulate } from "@/lib/sim";
import type { Fighter, FightEvent, Matchup } from "@/lib/types";
import { FighterAvatar } from "@/components/fighter/FighterAvatar";
import { Flag } from "@/components/ui/Flag";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { JsonLd } from "@/components/seo/JsonLd";
import { recordString, fmtOdds, noVigProbA, pct, cmToFtIn, cmToIn, confidenceLabel } from "@/lib/format";
import { ProPrediction } from "@/components/predict/ProPrediction";
import { FeatureGate } from "@/components/billing/FeatureGate";

// Programmatic "X vs Y prediction" pages — one per real bout on every card.
// High-intent organic landing pages: the Vex AI read (win %, method, round),
// real market odds + value signal, key factors, and a deep-link to run the sim.
// Everything is the transparent simulation over real fighter data; informational
// only, not betting advice. 21+.

const last = (name: string) => name.split(" ").slice(-1)[0];
const slugFor = (a: Fighter, b: Fighter) => `${a.slug}-vs-${b.slug}`;

type Resolved = { event: FightEvent; m: Matchup; a: Fighter; b: Fighter };

function resolve(slug: string): Resolved | null {
  for (const event of allEvents()) {
    for (const m of event.matchups) {
      const a = getFighterById(m.fighterA);
      const b = getFighterById(m.fighterB);
      if (!a || !b) continue;
      // Accept either fighter order so an indexed URL still resolves if the
      // data feed later flips fighterA/fighterB (canonical points to natural order).
      if (slugFor(a, b) === slug || slugFor(b, a) === slug) return { event, m, a, b };
    }
  }
  return null;
}

export function generateStaticParams() {
  const seen = new Set<string>();
  const out: { matchup: string }[] = [];
  for (const event of allEvents()) {
    for (const m of event.matchups) {
      const a = getFighterById(m.fighterA);
      const b = getFighterById(m.fighterB);
      if (!a || !b) continue;
      const slug = slugFor(a, b);
      if (seen.has(slug)) continue;
      seen.add(slug);
      out.push({ matchup: slug });
    }
  }
  return out;
}

// One simulation, reused by metadata + page. Deterministic enough at build time.
function read(r: Resolved) {
  const sim = simulate(r.a, r.b, {
    rounds: r.m.rounds,
    runs: 2000,
    shortNoticeA: r.m.shortNoticeA,
    shortNoticeB: r.m.shortNoticeB,
    missedWeightA: r.m.missedWeightA,
    missedWeightB: r.m.missedWeightB,
    injuredA: r.m.injuredA,
    injuredB: r.m.injuredB,
  });
  const favA = sim.probA >= 0.5;
  const fav = favA ? r.a : r.b;
  const dog = favA ? r.b : r.a;
  // Public-safe only: favoured side + a qualitative confidence label. The exact
  // win %, method split, round and value lean are Pro (served via /api/predict).
  const confidence = confidenceLabel(Math.max(sim.probA, sim.probB));
  return { fav, dog, favA, confidence };
}

export async function generateMetadata({ params }: { params: Promise<{ matchup: string }> }): Promise<Metadata> {
  const { matchup } = await params;
  const r = resolve(matchup);
  if (!r) return { title: "Fight Prediction" };
  const { fav, dog, confidence } = read(r);
  const lead = confidence === "Toss-up" ? "it's a toss-up" : `${fav.name} is the ${confidence.toLowerCase()}`;
  const title = `${r.a.name} vs ${r.b.name} Prediction — Who Wins?`;
  const description = `Vex AI's prediction for ${r.a.name} vs ${r.b.name} at ${r.event.name}: ${lead} over ${dog.name}. See the win probability, method-of-victory split, real odds and the full tale-of-the-tape — backtested, transparent. 21+. Not betting advice.`;
  return {
    title,
    description,
    alternates: { canonical: `/predict/${slugFor(r.a, r.b)}` },
    openGraph: { type: "article", title, description, url: `/predict/${slugFor(r.a, r.b)}` },
  };
}


function FighterMini({ f, favored }: { f: Fighter; favored: boolean }) {
  return (
    <Link href={`/fighters/${f.slug}`} className="group flex flex-col items-center text-center">
      <FighterAvatar fighter={f} size="lg" />
      <div className="mt-2 flex items-center gap-1.5">
        <Flag emoji={f.flag} country={f.country} className="h-3 w-[18px] shrink-0 rounded-[2px] border border-black/40" />
        <span className="font-display text-lg font-bold uppercase leading-none group-hover:text-blood">{f.name}</span>
      </div>
      <span className="mt-1 text-xs text-muted">{recordString(f.record)}</span>
      {favored && <span className="mt-1.5 rounded-full bg-blood/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blood">Vex AI pick</span>}
    </Link>
  );
}

export default async function PredictPage({ params }: { params: Promise<{ matchup: string }> }) {
  const { matchup } = await params;
  const r = resolve(matchup);
  if (!r) notFound();
  const { event, m, a, b } = r;
  const { fav, dog, favA, confidence } = read(r);

  const dateMs = new Date(event.date).getTime();
  const isPast = dateMs < Date.now() - 6 * 3.6e6;
  const dateLabel = new Date(event.date).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });

  // Real market odds (public) + the no-vig implied probability (market math only).
  const line = m.odds[0];
  const fair = line ? noVigProbA(line.priceA, line.priceB) : null;

  const faq = [
    {
      q: `Who will win ${a.name} vs ${b.name}?`,
      a: `Vex AI makes ${confidence === "Toss-up" ? "this close to a coin-flip" : `${fav.name} the ${confidence.toLowerCase()}`} over ${dog.name}. The exact win probability, method-of-victory split and likely round are in the full read (Pro). It's a backtested estimate, not a guarantee — MMA is high-variance, so ${dog.name} winning is well within range.`,
    },
    {
      q: `How does Vex AI predict ${last(a.name)} vs ${last(b.name)}?`,
      a: `It builds each fighter's rating from real statistics, then runs tens of thousands of style-aware, round-by-round Monte-Carlo simulations — modelling where the fight happens, fatigue, damage and finishing paths — to produce the win probability, method-of-victory split and round breakdown. Every category weight is published on the methodology page.`,
    },
    ...(line ? [{
      q: `What are the odds for ${a.name} vs ${b.name}?`,
      a: `Real market moneylines: ${a.name} ${fmtOdds(line.priceA)}, ${b.name} ${fmtOdds(line.priceB)}. The no-vig implied probability for ${a.name} is ${fair != null ? Math.round(fair * 100) : "–"}%. Vex AI's own probability and any value lean vs the market are in the full read (Pro).`,
    }] : []),
  ];

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SportsEvent",
        name: `${a.name} vs ${b.name}`,
        sport: "Mixed Martial Arts",
        startDate: event.date,
        eventStatus: isPast ? "https://schema.org/EventScheduled" : "https://schema.org/EventScheduled",
        ...(event.venue ? { location: { "@type": "Place", name: event.venue, ...(event.city ? { address: [event.city, event.country].filter(Boolean).join(", ") } : {}) } } : {}),
        competitor: [
          { "@type": "Person", name: a.name, url: `https://fightvex.com/fighters/${a.slug}` },
          { "@type": "Person", name: b.name, url: `https://fightvex.com/fighters/${b.slug}` },
        ],
        url: `https://fightvex.com/predict/${matchup}`,
        superEvent: { "@type": "SportsEvent", name: event.name, startDate: event.date },
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Predictions", item: "https://fightvex.com/events" },
          { "@type": "ListItem", position: 2, name: `${a.name} vs ${b.name}`, item: `https://fightvex.com/predict/${matchup}` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <JsonLd data={ld} />

      <div className="reveal">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="steel">{m.weightClass}</Badge>
          {m.isTitle && <Badge variant="amber">★ Title Bout</Badge>}
          <Badge variant="steel">{m.rounds} rounds</Badge>
          <Link href={`/events/${event.slug}`} className="text-muted hover:text-fg">{event.name} · {dateLabel}</Link>
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold uppercase leading-tight sm:text-4xl">
          {a.name} <span className="text-blood">vs</span> {b.name}: Prediction &amp; Pick
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          {isPast ? "Pre-fight " : ""}Vex AI&apos;s full read for this bout — the pick, win probability, method-of-victory, value lean and tale-of-the-tape. A Pro feature; start a 7-day free trial to unlock. Informational only, not betting advice.
        </p>
      </div>

      <FeatureGate minPlan="pro" title="Full prediction — Pro" description="Vex AI's pick, win probability, method-of-victory, likely round, the market value lean and the tale-of-the-tape for this bout. Start a 7-day free trial to unlock.">
      {/* Verdict — favoured side + qualitative confidence */}
      <Panel className="reveal bg-cage-fine relative mt-6 overflow-hidden p-6 sm:p-8">
        <div className="spotlight absolute inset-0 opacity-50" />
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <FighterMini f={a} favored={favA} />
          <span className="font-display text-sm font-bold uppercase text-muted">vs</span>
          <FighterMini f={b} favored={!favA} />
        </div>
        <div className="relative mt-6 rounded-xl border border-line bg-bg/50 p-4 text-center">
          <p className="text-[11px] uppercase tracking-wider text-muted">Vex AI verdict</p>
          <p className="mt-1 font-display text-xl font-bold">
            {confidence === "Toss-up" ? "Toss-up" : <>{fav.name} — <span className="text-blood">{confidence}</span></>}
          </p>
        </div>
      </Panel>

      {/* Full read — Pro (exact win %, method, round, value lean) */}
      <div className="reveal mt-6">
        <h2 className="mb-3 font-display text-lg font-bold uppercase">The full read</h2>
        <ProPrediction slug={slugFor(a, b)} />
      </div>

      {/* Market odds — real, public market data */}
      {line && (
        <Panel className="reveal mt-6 p-6">
          <h2 className="mb-3 font-display text-lg font-bold uppercase">Market odds</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">{a.name}</span><span className="font-semibold">{fmtOdds(line.priceA)}</span></div>
            <div className="flex justify-between"><span className="text-muted">{b.name}</span><span className="font-semibold">{fmtOdds(line.priceB)}</span></div>
            {fair != null && (
              <div className="flex justify-between border-t border-line/60 pt-2"><span className="text-muted">No-vig implied ({last(a.name)})</span><span>{pct(fair)}</span></div>
            )}
            {m.oddsSource && <p className="pt-1 text-[10px] uppercase tracking-wider text-faint">{m.oddsSource}</p>}
          </div>
        </Panel>
      )}

      {/* Key factors (public; the 'Vex AI favors X at Y%' factor is filtered out) */}
      {m.keyFactors?.some((f) => !f.includes("%")) && (
        <Panel className="reveal mt-6 p-6">
          <h2 className="mb-3 font-display text-lg font-bold uppercase">Key factors</h2>
          <ul className="space-y-2">
            {m.keyFactors.filter((f) => !f.includes("%")).map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-edge">›</span><span>{f}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Tale of the tape — real ESPN identity/record fields */}
      <Panel className="reveal mt-6 p-6">
        <h2 className="mb-3 font-display text-lg font-bold uppercase">Tale of the tape</h2>
        <div className="overflow-hidden rounded-lg border border-line/60">
          {[
            { label: "Record", a: recordString(a.record), b: recordString(b.record) },
            { label: "Age", a: a.age || "—", b: b.age || "—" },
            { label: "Height", a: a.heightCm ? cmToFtIn(a.heightCm) : "—", b: b.heightCm ? cmToFtIn(b.heightCm) : "—" },
            { label: "Reach", a: a.reachCm ? cmToIn(a.reachCm) : "—", b: b.reachCm ? cmToIn(b.reachCm) : "—" },
            { label: "Stance", a: a.stance || "—", b: b.stance || "—" },
            { label: "Ranking", a: a.title ? "Champion" : a.ranking !== undefined ? `#${a.ranking}` : "—", b: b.title ? "Champion" : b.ranking !== undefined ? `#${b.ranking}` : "—" },
            { label: "KO/TKO wins", a: a.record.ko, b: b.record.ko },
            { label: "Submission wins", a: a.record.sub, b: b.record.sub },
          ].map((row, i) => (
            <div key={row.label} className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 text-sm ${i % 2 ? "bg-bg/40" : ""}`}>
              <span className="text-right font-semibold text-fg">{row.a}</span>
              <span className="px-3 text-center text-[11px] uppercase tracking-wider text-muted">{row.label}</span>
              <span className="text-left font-semibold text-fg">{row.b}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between px-3 text-[11px] uppercase tracking-wider text-muted">
          <span>{last(a.name)}</span><span>{last(b.name)}</span>
        </div>
      </Panel>

      {/* CTA */}
      <div className="reveal mt-6 flex flex-col items-center gap-3 rounded-2xl panel p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h2 className="font-display text-lg font-bold uppercase">Run it yourself</h2>
          <p className="text-sm text-muted">Tweak rounds and short-notice, see the full round-by-round breakdown.</p>
        </div>
        <Link href={`/simulator?a=${a.id}&b=${b.id}`} className="btn-flare shrink-0 rounded-md px-6 py-3 text-sm font-bold uppercase tracking-wide">Open in Simulator →</Link>
      </div>

      {/* FAQ */}
      <div className="reveal mt-8">
        <h2 className="mb-4 font-display text-xl font-bold uppercase">FAQ</h2>
        <div className="space-y-3">
          {faq.map((f) => (
            <Panel key={f.q} className="p-5">
              <h3 className="font-display text-sm font-bold uppercase">{f.q}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.a}</p>
            </Panel>
          ))}
        </div>
      </div>

      {/* Interlink: other bouts on the same card (SEO + discovery) */}
      {event.matchups.some((mm) => mm.id !== m.id) && (
        <div className="reveal mt-8">
          <h2 className="mb-3 font-display text-lg font-bold uppercase">More predictions from {event.name}</h2>
          <div className="flex flex-wrap gap-2">
            {event.matchups
              .filter((mm) => mm.id !== m.id)
              .map((mm) => {
                const a2 = getFighterById(mm.fighterA);
                const b2 = getFighterById(mm.fighterB);
                if (!a2 || !b2) return null;
                return (
                  <Link
                    key={mm.id}
                    href={`/predict/${a2.slug}-vs-${b2.slug}`}
                    className="rounded-md border border-line/60 bg-bg/60 px-3 py-1.5 text-xs font-semibold transition-colors hover:border-steel"
                  >
                    {last(a2.name)} vs {last(b2.name)}
                  </Link>
                );
              })}
          </div>
        </div>
      )}
      </FeatureGate>

      <p className="mt-8 text-center text-[11px] leading-relaxed text-muted">
        21+. Predictions are probabilistic estimates from a transparent simulation, not guarantees or betting advice. Please gamble responsibly.
      </p>
    </div>
  );
}
