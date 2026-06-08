import type { Metadata } from "next";
import Link from "next/link";
import { nextEvent } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import { simulate } from "@/lib/sim";
import { FighterAvatar } from "@/components/fighter/FighterAvatar";
import { Flag } from "@/components/ui/Flag";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { JsonLd } from "@/components/seo/JsonLd";
import { PickRationale } from "@/components/predict/PickRationale";
import { ShareButton } from "@/components/ui/ShareButton";
import { recordString, fmtOdds, noVigProbA, pct, lastName } from "@/lib/format";
import type { Fighter } from "@/lib/types";

// Hourly so it rolls to the next card's headliner automatically.
export const revalidate = 3600;

function FreePickCol({ f, win, lead }: { f: Fighter; win: number; lead: boolean }) {
  return (
    <Link href={`/fighters/${f.slug}`} className="group flex flex-col items-center text-center">
      <FighterAvatar fighter={f} size="lg" />
      <div className="mt-2 flex items-center gap-1.5">
        <Flag emoji={f.flag} country={f.country} className="h-3 w-[18px] shrink-0 rounded-[2px] border border-black/40" />
        <span className="font-display text-lg font-bold uppercase leading-none group-hover:text-blood">{f.name}</span>
      </div>
      <span className="mt-1 text-xs text-muted">{recordString(f.record)}</span>
      <span className={`mt-1 font-display text-3xl font-bold ${lead ? "text-fg" : "text-muted"}`}>{win}%</span>
    </Link>
  );
}

export const metadata: Metadata = {
  title: "Free UFC Pick of the Week — Vex AI Prediction",
  description: "One full Vex AI fight prediction, free every week: the win probability, method-of-victory, likely round, real odds and the value lean for this week's UFC headliner. Backtested + transparent. 21+. Not betting advice.",
  alternates: { canonical: "/free-pick" },
};

export default function FreePickPage() {
  const event = nextEvent();
  // The free pick is NEVER the headliner (that stays Pro). Use the best
  // non-main bout — the first below the top line with both fighters scorable.
  const m =
    event.matchups.find((mm, i) => i > 0 && getFighterById(mm.fighterA) && getFighterById(mm.fighterB)) ??
    event.matchups[0];
  const a = getFighterById(m.fighterA)!;
  const b = getFighterById(m.fighterB)!;
  const sim = simulate(a, b, { rounds: m.rounds, runs: 2000, shortNoticeA: m.shortNoticeA, shortNoticeB: m.shortNoticeB, missedWeightA: m.missedWeightA, missedWeightB: m.missedWeightB, injuredA: m.injuredA, injuredB: m.injuredB });
  const aWin = Math.round(sim.probA * 100);
  const bWin = 100 - aWin;
  const favA = sim.probA >= 0.5;
  const fav = favA ? a : b;
  const dog = favA ? b : a;
  const method = favA ? sim.methodA : sim.methodB;
  const total = method.ko + method.sub + method.dec || 1;
  const split = { ko: Math.round((method.ko / total) * 100), sub: Math.round((method.sub / total) * 100), dec: Math.round((method.dec / total) * 100) };
  const how = split.dec >= split.ko && split.dec >= split.sub ? "by decision" : split.ko >= split.sub ? "by KO/TKO" : "by submission";
  const round = sim.headline.round ? ` (most likely round ${sim.headline.round})` : "";

  const line = m.odds[0];
  const fair = line ? noVigProbA(line.priceA, line.priceB) : null;
  const edge = fair != null ? sim.probA - fair : null;
  const valueSide = edge != null && Math.abs(edge) >= 0.04 ? (edge > 0 ? a : b) : null;
  const dateLabel = new Date(event.date).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });

  const parts = [
    { label: "KO/TKO", v: split.ko, c: "bg-blood" },
    { label: "Submission", v: split.sub, c: "bg-amber" },
    { label: "Decision", v: split.dec, c: "bg-edge" },
  ];

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SportsEvent",
        name: `${a.name} vs ${b.name}`,
        sport: "Mixed Martial Arts",
        startDate: event.date,
        competitor: [
          { "@type": "Person", name: a.name, url: `https://fightvex.com/fighters/${a.slug}` },
          { "@type": "Person", name: b.name, url: `https://fightvex.com/fighters/${b.slug}` },
        ],
        url: "https://fightvex.com/free-pick",
      },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <JsonLd data={ld} />

      <div className="reveal text-center">
        <Badge variant="edge">Free pick of the week</Badge>
        <h1 className="mt-3 font-display text-3xl font-bold uppercase sm:text-4xl">Vex AI&apos;s free UFC pick</h1>
        <p className="mx-auto mt-2 max-w-2xl text-muted">
          One full prediction, on the house — the complete Vex AI read for this week&apos;s headliner. Every other bout&apos;s pick is{" "}
          <Link href="/pricing" className="text-blood hover:underline">Pro</Link>. Informational only, not betting advice. 21+.
        </p>
      </div>

      {/* Matchup */}
      <Panel className="reveal bg-cage-fine relative mt-6 overflow-hidden p-6 sm:p-8">
        <div className="spotlight absolute inset-0 opacity-50" />
        <div className="relative flex flex-wrap items-center justify-center gap-2 text-xs">
          <Badge variant="steel">{m.weightClass}</Badge>
          {m.isTitle && <Badge variant="amber">★ Title Bout</Badge>}
          <Badge variant="steel">{m.rounds} rounds</Badge>
          <Link href={`/events/${event.slug}`} className="text-muted hover:text-fg">{event.name} · {dateLabel}</Link>
        </div>
        <div className="relative mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <FreePickCol f={a} win={aWin} lead={favA} />
          <span className="font-display text-sm font-bold uppercase text-muted">vs</span>
          <FreePickCol f={b} win={bWin} lead={!favA} />
        </div>
        <div className="relative mt-6 rounded-xl border border-line bg-bg/50 p-4 text-center">
          <p className="text-[11px] uppercase tracking-wider text-muted">Vex AI verdict</p>
          <p className="mt-1 font-display text-xl font-bold">{fav.name} to win · <span className="text-blood">{Math.max(aWin, bWin)}%</span> · {how}{round}</p>
          <p className="mt-1 text-xs text-muted">Confidence: {sim.variance === "LOW" ? "high" : sim.variance === "HIGH" ? "low (volatile)" : "medium"}</p>
        </div>
      </Panel>

      {/* Plain-English rationale, generated from the model's own factor edges */}
      <PickRationale sim={sim} a={a} b={b} className="reveal mt-6" />

      <div className="reveal mt-5 flex justify-center">
        <ShareButton text={`Vex AI's free UFC pick: ${fav.name} ${Math.max(aWin, bWin)}% over ${dog.name}.`} label="Share this pick" />
      </div>

      {/* Method + odds/value */}
      <div className="reveal mt-6 grid gap-6 sm:grid-cols-2">
        <Panel className="p-6">
          <h2 className="mb-3 font-display text-lg font-bold uppercase">How {lastName(fav.name)} wins</h2>
          <div className="flex h-3 overflow-hidden rounded-full bg-line/40">{parts.map((p) => <div key={p.label} className={p.c} style={{ width: `${p.v}%` }} />)}</div>
          <div className="mt-2 flex justify-between text-xs text-muted">{parts.map((p) => <span key={p.label}>{p.label} <b className="text-fg">{p.v}%</b></span>)}</div>
        </Panel>
        <Panel className="p-6">
          <h2 className="mb-3 font-display text-lg font-bold uppercase">Odds &amp; value</h2>
          {line ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">{a.name}</span><span className="font-semibold">{fmtOdds(line.priceA)}</span></div>
              <div className="flex justify-between"><span className="text-muted">{b.name}</span><span className="font-semibold">{fmtOdds(line.priceB)}</span></div>
              {fair != null && <div className="flex justify-between border-t border-line/60 pt-2"><span className="text-muted">No-vig implied ({lastName(a.name)})</span><span>{pct(fair)}</span></div>}
              <div className="flex justify-between"><span className="text-muted">Vex AI ({lastName(a.name)})</span><span className="font-semibold text-edge">{pct(sim.probA)}</span></div>
              {valueSide && <p className="mt-1 rounded-md border border-edge/40 bg-edge/10 px-3 py-2 text-xs text-edge">Value lean: {valueSide.name}</p>}
            </div>
          ) : <p className="text-sm text-muted">No market line captured for this bout yet.</p>}
        </Panel>
      </div>

      {/* CTA */}
      <div className="reveal mt-6 flex flex-col items-center gap-3 rounded-2xl panel p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h2 className="font-display text-lg font-bold uppercase">Want every pick?</h2>
          <p className="text-sm text-muted">Pro unlocks the full read on every bout, all betting tools and the locked-in picks. Start a 7-day free trial.</p>
        </div>
        <Link href="/pricing" className="btn-flare shrink-0 rounded-md px-6 py-3 text-sm font-bold uppercase tracking-wide">Go Pro →</Link>
      </div>

      <p className="mt-8 text-center text-[11px] leading-relaxed text-muted">
        21+. A probabilistic estimate from a transparent, backtested simulation — not a guarantee or betting advice. Please gamble responsibly.
      </p>
    </div>
  );
}
