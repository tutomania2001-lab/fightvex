import type { Metadata } from "next";
import Link from "next/link";
import { upcomingEvents } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import { simulate } from "@/lib/sim";
import { Badge } from "@/components/ui/Badge";
import { JsonLd } from "@/components/seo/JsonLd";
import { bestPrice, noVigProbA, fmtOdds, lastName, recordString, confidenceLabel } from "@/lib/format";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "UFC Upset Radar — Where the Vex AI Disagrees With the Bookies",
  description: "This week's UFC bouts where the Vex AI model backs the betting underdog against the market — ranked by confidence, with the real odds. Transparent, backtested AI. 21+. Not betting advice.",
  alternates: { canonical: "/upsets" },
};

type Row = { evt: string; slug: string; boutId: string; wc: string; dog: string; dogRec: string; opp: string; conf: number; price: number };

export default function UpsetsPage() {
  const rows: Row[] = [];
  for (const e of upcomingEvents()) {
    for (const m of e.matchups) {
      const a = getFighterById(m.fighterA);
      const b = getFighterById(m.fighterB);
      if (!a || !b || !m.odds.length) continue;
      const sim = simulate(a, b, { rounds: m.rounds, runs: 800, shortNoticeA: m.shortNoticeA, shortNoticeB: m.shortNoticeB, missedWeightA: m.missedWeightA, missedWeightB: m.missedWeightB, injuredA: m.injuredA, injuredB: m.injuredB });
      const favA = sim.probA >= 0.5;
      const fair = noVigProbA(bestPrice(m.odds.map((o) => o.priceA)), bestPrice(m.odds.map((o) => o.priceB)));
      const marketFavA = fair >= 0.5;
      if (favA === marketFavA) continue; // Vex agrees with the market — not an upset call
      const fav = favA ? a : b;
      const opp = favA ? b : a;
      const price = bestPrice((favA ? m.odds.map((o) => o.priceA) : m.odds.map((o) => o.priceB)));
      rows.push({ evt: e.name, slug: e.slug, boutId: m.id, wc: m.weightClass, dog: fav.name, dogRec: recordString(fav.record), opp: opp.name, conf: Math.max(sim.probA, sim.probB), price });
    }
  }
  rows.sort((x, y) => y.conf - x.conf);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "UFC Upset Radar", url: "https://fightvex.com/upsets" }} />
      <div className="reveal">
        <Badge variant="blood">Upset Radar</Badge>
        <h1 className="mt-3 font-display text-3xl font-bold uppercase sm:text-4xl">Where Vex AI fades the <span className="text-blood">favourite</span></h1>
        <p className="mt-2 max-w-2xl text-muted">Upcoming bouts where the model backs the <b className="text-fg">betting underdog</b> — ranked by Vex AI confidence, with the real best price. Directional picks are free; the exact win % and value math are <Link href="/pricing" className="text-blood hover:underline">Pro</Link>. 21+. Not betting advice.</p>
      </div>

      {rows.length === 0 ? (
        <div className="reveal mt-8 rounded-xl border border-line/60 bg-panel/40 p-6 text-center text-muted">
          No upset calls on the board right now — Vex AI agrees with the market on this week&apos;s favourites. Check back as new cards are added.
        </div>
      ) : (
        <div className="reveal-stagger mt-7 space-y-3">
          {rows.map((r) => (
            <Link key={r.boutId} href={`/events/${r.slug}#${r.boutId}`} className="reveal block">
              <div className="panel panel-hover flex items-center gap-4 rounded-xl p-4 sm:p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blood/40 bg-blood/10 font-display text-sm font-bold text-blood">DOG</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-bold uppercase leading-tight">
                    Vex backs <span className="text-fg">{lastName(r.dog)}</span> <span className="text-muted">over {lastName(r.opp)}</span>
                  </p>
                  <p className="tnum mt-0.5 text-xs text-muted">{r.dogRec} · {r.wc} · {r.evt}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`tnum font-display text-lg font-bold ${r.price > 0 ? "text-edge" : "text-fg"}`}>{fmtOdds(r.price)}</p>
                  <p className="text-[11px] uppercase tracking-wide text-edge">{confidenceLabel(r.conf)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="reveal mt-8 flex flex-col items-center gap-3 rounded-2xl panel p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-muted">Want the exact win probability and value edge on every bout — not just the upsets?</p>
        <Link href="/pricing" className="btn-flare shrink-0 rounded-md px-6 py-3 text-sm font-bold uppercase tracking-wide">Go Pro →</Link>
      </div>
    </div>
  );
}
