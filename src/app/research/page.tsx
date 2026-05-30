import type { Metadata } from "next";
import Link from "next/link";
import { allInsights } from "@/lib/data/research";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";

export const metadata: Metadata = {
  title: "AI Research Engine",
  description: "Near-real-time, source-attributed MMA intelligence with confidence scores and impact analysis.",
};

const confTone = { High: "edge", Medium: "amber", Low: "steel" } as const;

export default function ResearchPage() {
  const insights = allInsights().sort((a, b) => b.impactScore - a.impactScore);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Badge variant="blood">AI Research Engine</Badge>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase sm:text-5xl">Intelligence Feed</h1>
        <p className="mt-2 max-w-2xl text-muted">
          The MMA world, monitored continuously from compliant sources. Every insight
          carries its source, recency, confidence and likely impact. Nothing is unsourced.
        </p>
      </div>

      {/* Source legend */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["Licensed API", "Official", "Public Record", "News (attributed)", "User-submitted"].map((s) => (
          <Badge key={s} variant="neutral">{s}</Badge>
        ))}
      </div>

      <div className="space-y-4">
        {insights.map((i) => (
          <Panel key={i.id} hover className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row">
              {/* Impact meter */}
              <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-start">
                <div className="text-center">
                  <div className="tnum font-display text-3xl font-bold text-blood">{i.impactScore}</div>
                  <p className="text-[9px] uppercase tracking-wider text-muted">Impact</p>
                </div>
              </div>

              <div className="flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="blood">{i.type}</Badge>
                  <Badge variant={confTone[i.confidence]}>Confidence: {i.confidence}</Badge>
                  <span className="text-[10px] text-muted">{i.recency}</span>
                </div>
                <h2 className="font-display text-lg font-bold text-fg">{i.headline}</h2>
                <p className="mt-1 text-sm text-muted">{i.summary}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {i.impact.map((d) => (<Badge key={d} variant="steel">{d}</Badge>))}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[11px] text-muted">
                  <span>Source: <span className="text-fg">{i.source}</span> · {i.sourceType}</span>
                  <div className="flex gap-3">
                    {i.fighterSlug && <Link href={`/fighters/${i.fighterSlug}`} className="text-blood hover:underline">Fighter →</Link>}
                    {i.eventSlug && <Link href={`/events/${i.eventSlug}`} className="text-blood hover:underline">Event →</Link>}
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <p className="mt-8 rounded-lg border border-line bg-panel/60 p-4 text-[11px] leading-relaxed text-muted">
        The production research engine uses an NLP layer over a licensed corpus to
        summarize and classify announcements, weigh-ins, camp changes, odds moves and
        attributed news. The language model summarizes and tags — it never invents
        statistics or probabilities. High-impact flags are human-reviewed. 21+.
      </p>
    </div>
  );
}
