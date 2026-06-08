import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { allFighters, getFighter, getFighterById } from "@/lib/data/fighters";
import { upcomingEvents } from "@/lib/data/events";
import { FighterAvatar } from "@/components/fighter/FighterAvatar";
import { Flag } from "@/components/ui/Flag";
import { Badge } from "@/components/ui/Badge";
import { StatBar } from "@/components/ui/StatBar";
import { Panel } from "@/components/ui/Panel";
import { CareerHistory } from "@/components/live/CareerHistory";
import { RelatedNews } from "@/components/live/RelatedNews";
import { JsonLd } from "@/components/seo/JsonLd";
import { recordString, finishBreakdown, cmToFtIn, cmToIn } from "@/lib/format";
import { strikingFor } from "@/lib/data/striking.generated";

// Segmented bar for a 3-way percentage split (target or position mix).
function StrikeSplit({ parts }: { parts: { label: string; v: number }[] }) {
  const colors = ["bg-blood", "bg-amber", "bg-edge"];
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-line/40">
        {parts.map((p, i) => <div key={p.label} className={colors[i]} style={{ width: `${p.v}%` }} />)}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        {parts.map((p) => <span key={p.label}>{p.label} <b className="text-fg">{p.v}%</b></span>)}
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return allFighters().map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = getFighter(slug);
  if (!f) return { title: "Fighter" };
  const title = `${f.name} — UFC Record, Stats & Fight Simulator`;
  const description = `${f.name}${f.nickname ? ` "${f.nickname}"` : ""} — ${f.weightClass}, ${recordString(f.record)}. Real UFC record, per-fight stats, rankings and career history, plus a free Vex AI fight simulator. 21+.`;
  return {
    title,
    description,
    alternates: { canonical: `/fighters/${f.slug}` },
    openGraph: { type: "profile", title, description, url: `/fighters/${f.slug}` },
  };
}

export default async function FighterProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = getFighter(slug);
  if (!f) notFound();
  const striking = strikingFor(f.name); // descriptive UFCStats striking-tendency insight (not a prediction input)

  // If this fighter is booked on an upcoming card, surface a link to the bout's
  // prediction page (cross-links the prediction graph; helps users + SEO).
  const upcomingBout = (() => {
    for (const e of upcomingEvents()) {
      for (const m of e.matchups) {
        if (m.fighterA !== f.id && m.fighterB !== f.id) continue;
        const a = getFighterById(m.fighterA);
        const b = getFighterById(m.fighterB);
        if (!a || !b) continue;
        return { event: e, opp: m.fighterA === f.id ? b : a, slug: `${a.slug}-vs-${b.slug}` };
      }
    }
    return null;
  })();

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `https://fightvex.com/fighters/${f.slug}#person`,
        name: f.name,
        ...(f.nickname ? { alternateName: f.nickname } : {}),
        jobTitle: "Mixed Martial Artist",
        ...(f.country ? { nationality: f.country } : {}),
        url: `https://fightvex.com/fighters/${f.slug}`,
        ...(f.image ? { image: `https://fightvex.com${f.image}` } : {}),
        memberOf: { "@type": "SportsOrganization", name: "UFC" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Fighters", item: "https://fightvex.com/fighters" },
          { "@type": "ListItem", position: 2, name: f.name, item: `https://fightvex.com/fighters/${f.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={ld} />
      {/* HERO — all real ESPN identity/bio/record */}
      <div className="reveal panel bg-cage-fine relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="spotlight absolute inset-0 opacity-60" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end">
          <FighterAvatar fighter={f} size="xl" className="self-center sm:self-end sm:-mb-6" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Exact ESPN title for champions; no title => no champion badge. */}
              {f.title && <Badge variant="amber">★ {f.title}</Badge>}
              {!f.title && f.ranking !== undefined && <Badge variant="steel">#{f.ranking} Ranked</Badge>}
              <Badge variant="steel">{f.weightClass}</Badge>
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-none sm:text-5xl">{f.name}</h1>
            {f.nickname && <p className="mt-1 text-lg italic text-blood">“{f.nickname}”</p>}
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><Flag emoji={f.flag} country={f.country} className="h-3.5 w-[21px] rounded-[2px]" /> {f.country}{f.gym ? ` · ${f.gym}` : ""}</p>
          </div>
          <div className="text-right">
            <p className="tnum font-display text-4xl font-bold text-fg">{recordString(f.record)}</p>
            <p className="text-xs uppercase tracking-wider text-muted">{finishBreakdown(f.record)}</p>
            <div className="mt-3 flex gap-2 sm:justify-end">
              <Link href={`/simulator?a=${f.id}`} className="btn-flare rounded-md px-4 py-2 text-xs font-bold uppercase">Simulate</Link>
              <Link href={`/compare?a=${f.id}`} className="rounded-md border border-line px-4 py-2 text-xs font-bold uppercase hover:border-steel">Compare</Link>
            </div>
          </div>
        </div>

        {/* Vitals — real ESPN fields only ("N/A" when missing) */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-line pt-6 sm:grid-cols-4">
          {[
            { k: "Age", v: f.age || "N/A" },
            { k: "Height", v: f.heightCm ? cmToFtIn(f.heightCm) : "N/A" },
            { k: "Reach", v: f.reachCm ? cmToIn(f.reachCm) : "N/A" },
            { k: "Stance", v: f.stance || "N/A" },
          ].map((s) => (
            <div key={s.k}>
              <p className="tnum text-lg font-bold text-fg">{s.v}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted">{s.k}</p>
            </div>
          ))}
        </div>
      </div>

      {upcomingBout && (
        <Link
          href={`/predict/${upcomingBout.slug}`}
          className="reveal mt-4 flex items-center justify-between gap-3 rounded-xl border border-blood/40 bg-blood/10 px-5 py-3 transition-colors hover:border-blood"
        >
          <span className="text-sm">
            <b className="uppercase tracking-wide">Next fight:</b> vs {upcomingBout.opp.name} ·{" "}
            {new Date(upcomingBout.event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {upcomingBout.event.name}
          </span>
          <span className="shrink-0 text-sm font-bold uppercase text-blood">Prediction →</span>
        </Link>
      )}

      {/* CAREER HISTORY — REAL ESPN fight history (loading / data / empty state) */}
      <Panel className="reveal mt-6 p-6">
        <h2 className="mb-1 font-display text-xl font-bold uppercase">Career History</h2>
        <p className="mb-4 text-xs text-muted">Official results from ESPN.</p>
        <CareerHistory athleteId={f.id} />
      </Panel>

      {/* PERFORMANCE — REAL ESPN per-fight statistics only (no estimates) */}
      <div className="reveal-stagger mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel className="reveal p-6">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold uppercase">Performance Metrics</h2>
            <span className="text-[10px] uppercase tracking-wider text-faint">Official ESPN per-fight stats</span>
          </div>
          {f.statsReal ? (
            <>
              <p className="mb-4 text-xs text-muted">Strikes, takedowns, knockdowns, control &amp; defense, aggregated from official ESPN per-fight statistics (recent fights).</p>
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blood">Striking</p>
                  <StatBar label="Sig. strikes landed /min" value={f.stats.slpm} max={7} />
                  <StatBar label="Striking accuracy" value={f.stats.strAcc} suffix="%" />
                  <StatBar label="Strikes absorbed /min" value={f.stats.sapm} max={7} tone="amber" />
                  <StatBar label="Striking defense" value={f.stats.strDef} suffix="%" tone="edge" />
                  <StatBar label="Knockdowns /15" value={f.stats.kdAvg} max={2.2} />
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-edge">Grappling</p>
                  <StatBar label="Takedowns /15" value={f.stats.tdAvg} max={6} tone="edge" />
                  <StatBar label="Takedown accuracy" value={f.stats.tdAcc} suffix="%" tone="edge" />
                  <StatBar label="Takedown defense" value={f.stats.tdDef} suffix="%" tone="edge" />
                  <StatBar label="Submission /15" value={f.stats.subAvg} max={3} tone="edge" />
                  <StatBar label="Control min /15" value={f.stats.ctrl} max={8} tone="edge" />
                </div>
              </div>
              {striking && (
                <div className="mt-6 rounded-lg border border-line/60 bg-bg/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blood">Striking Profile</p>
                    <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-fg">{striking.label}</span>
                  </div>
                  <p className="mt-2 text-sm leading-snug text-fg">{striking.blurb}</p>
                  <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted">Strike target</p>
                      <StrikeSplit parts={[{ label: "Head", v: striking.head }, { label: "Body", v: striking.body }, { label: "Leg", v: striking.leg }]} />
                    </div>
                    <div>
                      <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted">Where it lands</p>
                      <StrikeSplit parts={[{ label: "Distance", v: striking.distance }, { label: "Clinch", v: striking.clinch }, { label: "Ground", v: striking.ground }]} />
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] uppercase tracking-widest text-faint">From {striking.fights} fights · UFCStats significant-strike data</p>
                </div>
              )}
            </>
          ) : (
            <p className="rounded-lg border border-line bg-panel/60 p-4 text-sm text-muted">No official ESPN per-fight statistics available for this fighter.</p>
          )}
          <p className="mt-5 border-t border-line pt-4 text-[11px] text-muted">
            Win-probability projections live in the{" "}
            <Link href={`/simulator?a=${f.id}`} className="text-blood hover:underline">Vex AI simulator</Link> — the only modelled figures on the site.
          </p>
        </Panel>

        {/* Related intelligence — REAL ESPN news (or empty state) */}
        <Panel className="reveal p-6">
          <h2 className="mb-4 font-display text-xl font-bold uppercase">Related Intelligence</h2>
          <RelatedNews athleteId={f.id} limit={5} />
        </Panel>
      </div>
    </div>
  );
}
