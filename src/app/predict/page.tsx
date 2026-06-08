import type { Metadata } from "next";
import Link from "next/link";
import { upcomingEvents } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import { simulate } from "@/lib/sim";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { JsonLd } from "@/components/seo/JsonLd";
import { lastName } from "@/lib/format";

export const metadata: Metadata = {
  title: "UFC Fight Predictions — Vex AI Picks for Every Bout",
  description: "Free Vex AI predictions for every upcoming UFC bout: the favored fighter, win probability and likely method — backtested and transparent. Pick a matchup for the full breakdown. 21+. Not betting advice.",
  alternates: { canonical: "/predict" },
};

export default function PredictHub() {
  const events = upcomingEvents();

  const items: { name: string; url: string }[] = [];
  const sections = events.map((e) => {
    const rows = e.matchups
      .map((m) => {
        const a = getFighterById(m.fighterA);
        const b = getFighterById(m.fighterB);
        if (!a || !b) return null;
        const sim = simulate(a, b, { rounds: m.rounds, runs: 400, shortNoticeA: m.shortNoticeA, shortNoticeB: m.shortNoticeB });
        const favA = sim.probA >= 0.5;
        const fav = favA ? a : b;
        const prob = Math.round(Math.max(sim.probA, sim.probB) * 100);
        const slug = `${a.slug}-vs-${b.slug}`;
        items.push({ name: `${a.name} vs ${b.name}`, url: `https://fightvex.com/predict/${slug}` });
        return { a, b, m, fav, prob, slug };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    return { e, rows };
  });

  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "UFC Fight Predictions",
    url: "https://fightvex.com/predict",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: it.url })),
    },
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <JsonLd data={ld} />
      <div className="reveal">
        <h1 className="font-display text-3xl font-bold uppercase sm:text-4xl">UFC Fight Predictions</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Vex AI&apos;s read on every upcoming bout — the favored fighter and win probability, from a transparent,
          backtested simulation over real data. Open any matchup for the full method-of-victory split, odds and key
          factors. Informational only, not betting advice. 21+.
        </p>
      </div>

      <div className="mt-8 space-y-8">
        {sections.map(({ e, rows }) => (
          <section key={e.slug} className="reveal">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-bold uppercase">{e.name}</h2>
              <Link href={`/events/${e.slug}`} className="text-sm text-blood hover:underline">Full card →</Link>
            </div>
            <div className="space-y-2">
              {rows.map(({ a, b, m, fav, prob, slug }) => (
                <Link
                  key={slug}
                  href={`/predict/${slug}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-bg/60 px-4 py-3 transition-colors hover:border-steel"
                >
                  <div className="min-w-0">
                    <div className="truncate font-display text-sm font-bold uppercase">{a.name} <span className="text-blood">vs</span> {b.name}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Badge variant="steel">{m.weightClass}</Badge>
                      {m.isTitle && <Badge variant="amber">★ Title</Badge>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted">Vex AI</div>
                    <div className="font-display text-sm font-bold">{lastName(fav.name)} <span className="text-edge">{prob}%</span></div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
