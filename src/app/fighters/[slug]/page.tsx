import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { allFighters, getFighter } from "@/lib/data/fighters";
import { insightsForFighter } from "@/lib/data/research";
import { subscores } from "@/lib/sim";
import { FighterAvatar } from "@/components/fighter/FighterAvatar";
import { RiskFlags } from "@/components/fighter/RiskFlags";
import { Badge } from "@/components/ui/Badge";
import { StatBar } from "@/components/ui/StatBar";
import { Radar } from "@/components/ui/Radar";
import { Trajectory } from "@/components/ui/Trajectory";
import { Panel } from "@/components/ui/Panel";
import { recordString, finishBreakdown, cmToFtIn, cmToIn } from "@/lib/format";

export function generateStaticParams() {
  return allFighters().map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = getFighter(slug);
  return { title: f ? `${f.name}${f.nickname ? ` "${f.nickname}"` : ""}` : "Fighter" };
}

export default async function FighterProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = getFighter(slug);
  if (!f) notFound();

  const sub = subscores(f);
  const radar = ["Striking", "Wrestling", "Grappling", "Submission", "Cardio", "Durability"].map((k) => ({
    label: k.slice(0, 4),
    a: Math.round(sub[k]),
  }));
  const insights = insightsForFighter(slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* HERO */}
      <div className="panel bg-cage-fine relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="spotlight absolute inset-0 opacity-60" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <FighterAvatar fighter={f} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {f.champion && <Badge variant="amber">★ Champion</Badge>}
              {!f.champion && f.ranking !== undefined && <Badge variant="steel">#{f.ranking} Ranked</Badge>}
              <Badge variant="steel">{f.weightClass}</Badge>
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-none sm:text-5xl">{f.name}</h1>
            {f.nickname && <p className="mt-1 text-lg italic text-blood">“{f.nickname}”</p>}
            <p className="mt-2 text-sm text-muted">{f.flag} {f.country} · {f.gym}</p>
          </div>
          <div className="text-right">
            <p className="tnum font-display text-4xl font-bold text-fg">{recordString(f.record)}</p>
            <p className="text-xs uppercase tracking-wider text-muted">{finishBreakdown(f.record)}</p>
            <div className="mt-3 flex gap-2 sm:justify-end">
              <Link href={`/simulator?a=${f.id}`} className="rounded-md bg-blood px-4 py-2 text-xs font-bold uppercase text-white hover:bg-blood-dim">Simulate</Link>
              <Link href={`/compare?a=${f.id}`} className="rounded-md border border-line px-4 py-2 text-xs font-bold uppercase hover:border-steel">Compare</Link>
            </div>
          </div>
        </div>

        {/* Vitals */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-line pt-6 sm:grid-cols-5">
          {[
            { k: "Age", v: f.age },
            { k: "Height", v: cmToFtIn(f.heightCm) },
            { k: "Reach", v: cmToIn(f.reachCm) },
            { k: "Stance", v: f.stance },
            { k: "Layoff", v: `${f.layoffMonths} mo` },
          ].map((s) => (
            <div key={s.k}>
              <p className="tnum text-lg font-bold text-fg">{s.v}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted">{s.k}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI STYLE */}
      <Panel className="mt-6 p-6">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="blood">AI Style Summary</Badge>
          <span className="text-[10px] text-muted">Generated from statistical profile · labeled, not opinion</span>
        </div>
        <p className="text-lg leading-relaxed text-fg">{f.styleSummary}</p>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Performance panels */}
        <Panel className="p-6">
          <h2 className="mb-4 font-display text-xl font-bold uppercase">Performance Metrics</h2>
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
              <StatBar label="Control min /round" value={f.stats.ctrl} max={4} tone="edge" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-5">
            <Mini label="Cardio / Pace" v={f.stats.cardio} />
            <Mini label="Durability" v={f.stats.durability} />
            <Mini label="Opp. Quality" v={f.oppQuality} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-edge/30 bg-edge/5 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-edge">Strengths</p>
              <ul className="space-y-1 text-sm text-muted">{f.strengths.map((s) => (<li key={s}>✓ {s}</li>))}</ul>
            </div>
            <div className="rounded-lg border border-blood/30 bg-blood/5 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blood">Weaknesses</p>
              <ul className="space-y-1 text-sm text-muted">{f.weaknesses.map((s) => (<li key={s}>✗ {s}</li>))}</ul>
            </div>
          </div>
        </Panel>

        {/* Radar + risk */}
        <div className="space-y-6">
          <Panel className="flex flex-col items-center p-6">
            <h2 className="mb-2 self-start font-display text-xl font-bold uppercase">Skill Profile</h2>
            <Radar data={radar} />
          </Panel>
          <Panel className="p-6">
            <h2 className="mb-4 font-display text-xl font-bold uppercase">Risk Flags</h2>
            <RiskFlags flags={f.riskFlags} />
          </Panel>
        </div>
      </div>

      {/* Trajectory */}
      <Panel className="mt-6 p-6">
        <h2 className="mb-4 font-display text-xl font-bold uppercase">Career Trajectory</h2>
        <Trajectory form={f.form} />
        <div className="mt-2 flex gap-4 text-[11px] text-muted">
          <span><span className="text-edge">●</span> Win</span>
          <span><span className="text-blood">●</span> Loss</span>
          <span><span className="text-amber">●</span> Draw</span>
        </div>
      </Panel>

      {/* Fight history */}
      <Panel className="mt-6 overflow-hidden p-0">
        <h2 className="border-b border-line p-6 font-display text-xl font-bold uppercase">Fight History</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="p-3 pl-6">Result</th><th className="p-3">Opponent</th><th className="p-3">Method</th><th className="p-3">Rd</th><th className="p-3 pr-6">Date</th>
            </tr>
          </thead>
          <tbody>
            {f.form.map((e, i) => (
              <tr key={i} className="border-b border-line-soft last:border-0">
                <td className="p-3 pl-6">
                  <span className={e.result === "W" ? "text-edge" : e.result === "L" ? "text-blood" : "text-amber"}>{e.result}</span>
                </td>
                <td className="p-3 text-fg">{e.opponent}</td>
                <td className="p-3 text-muted">{e.method}</td>
                <td className="tnum p-3 text-muted">{e.round}</td>
                <td className="tnum p-3 pr-6 text-muted">{e.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* Related insights */}
      {insights.length > 0 && (
        <Panel className="mt-6 p-6">
          <h2 className="mb-4 font-display text-xl font-bold uppercase">Related Intelligence</h2>
          <div className="space-y-3">
            {insights.map((i) => (
              <div key={i.id} className="rounded-lg border border-line bg-panel-2/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg">{i.headline}</span>
                  <Badge variant="steel">{i.type}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{i.summary}</p>
                <p className="mt-2 text-[10px] text-muted">{i.source} · Confidence: {i.confidence} · {i.recency}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function Mini({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2/50 p-3 text-center">
      <p className="tnum text-2xl font-bold text-fg">{v}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}
