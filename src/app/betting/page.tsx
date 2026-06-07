import type { Metadata } from "next";
import Link from "next/link";
import { upcomingEvents } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import { simulate, type SimResult } from "@/lib/sim";
import type { FightEvent, Matchup, Fighter } from "@/lib/types";
import { FightDesk, type DeskFight } from "@/components/betting/FightDesk";
import { BettingStage } from "@/components/betting/BettingStage";
import { Panel } from "@/components/ui/Panel";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { JsonLd } from "@/components/seo/JsonLd";
import { ODDS_SOURCE, ODDS_OPEN_SOURCE } from "@/lib/data/odds.generated";
import { getSeriesMap, kvEnabled, oddsApiEnabled } from "@/lib/odds-live";
import { Flag } from "@/components/ui/Flag";
import { noVigProbA, bestPrice, fmtOdds, toDecimal, pct, lastName, signClass } from "@/lib/format";

// Re-read the live series periodically (ISR) so scheduled odds snapshots show up.
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "UFC Betting Tools — Odds, Value Signals, EV & CLV Calculators",
  description:
    "Free UFC & MMA betting tools: real market odds, no-vig implied probability, Vex AI value signals, a line-movement tracker, and expected-value (EV), closing-line-value (CLV) and Kelly bankroll calculators. Informational only — not betting advice. 21+.",
  alternates: { canonical: "/betting" },
};

// How many bouts fit one screen without scrolling (the board is paged in chunks).
const BOUTS_PER_PAGE = 5;

type BoardRow = { e: FightEvent; m: Matchup; a: Fighter; b: Fighter; sim: SimResult; bestA: number; bestB: number; fairA: number; edge: number };

export default async function BettingPage() {
  // Date-based upcoming cards only (rolls past a completed event automatically,
  // matching the home page) so the board never shows a finished card's stale odds.
  const ids = upcomingEvents().flatMap((e) => e.matchups.map((m) => m.id));
  const seriesMap = await getSeriesMap(ids); // static seed + any live snapshots
  const liveFeed = kvEnabled && oddsApiEnabled;

  // Odds board — current = latest snapshot in the series when available, else the
  // captured static line. Value signals compare Vex AI vs this real no-vig market.
  const rows: BoardRow[] = upcomingEvents().flatMap((e) =>
    e.matchups.map((m) => {
      const a = getFighterById(m.fighterA)!;
      const b = getFighterById(m.fighterB)!;
      // 1000 runs to match the Simulator page exactly, so a fight's Vex AI %
      // is identical wherever it appears (server-rendered + ISR-cached, so the
      // extra runs cost nothing per request).
      const sim = simulate(a, b, { rounds: m.rounds, runs: 1000, shortNoticeA: m.shortNoticeA, shortNoticeB: m.shortNoticeB });
      const series = seriesMap[m.id];
      const latest = series && series.length ? series[series.length - 1] : null;
      const bestA = latest ? latest.a : bestPrice(m.odds.map((o) => o.priceA));
      const bestB = latest ? latest.b : bestPrice(m.odds.map((o) => o.priceB));
      const fairA = noVigProbA(bestA, bestB);
      return { e, m, a, b, sim, bestA, bestB, fairA, edge: sim.probA - fairA };
    })
  );

  // Page the board BY CARD, balancing each card's bouts into near-equal pages
  // (sizes differ by at most one) — so every slide is one card and roughly the
  // same size (no sparse pages), and the card menu maps cleanly to slides.
  const byEvent: BoardRow[][] = [];
  for (const r of rows) {
    const last = byEvent[byEvent.length - 1];
    if (last && last[0].e.slug === r.e.slug) last.push(r);
    else byEvent.push([r]);
  }
  const chunks: BoardRow[][] = [];
  for (const grp of byEvent) {
    const np = Math.max(1, Math.ceil(grp.length / BOUTS_PER_PAGE));
    const b = Math.floor(grp.length / np);
    const ex = grp.length % np; // first `ex` pages of this card carry one more bout
    for (let pi = 0, idx = 0; pi < np; pi++) {
      const size = b + (pi < ex ? 1 : 0);
      chunks.push(grp.slice(idx, idx + size));
      idx += size;
    }
  }
  const boardSections = chunks.map((chunk, i) => (
    <BoardSection key={i} rows={chunk} index={i} total={chunks.length} withDisclaimer={i === chunks.length - 1} />
  ));

  // Card menu above the board — one short tab per event (only ~3 a week). Each
  // tab jumps to that card's first slide; the active tab tracks the current page.
  const eventFirstPage = new Map<string, number>();
  const slugToCard = new Map<string, number>();
  const cards: { short: string; date: string; firstPage: number }[] = [];
  chunks.forEach((chunk, pi) => {
    for (const r of chunk) {
      if (!eventFirstPage.has(r.e.slug)) {
        slugToCard.set(r.e.slug, cards.length);
        eventFirstPage.set(r.e.slug, pi);
        cards.push({ short: shortCardName(r.e.name), date: shortDate(r.e.date), firstPage: pi });
      }
    }
  });
  // For each page, which card it belongs to (by its first bout) — drives the
  // active highlight as the user scrolls/pages through the board.
  const pageCardIndex = chunks.map((chunk) => slugToCard.get(chunk[0].e.slug) ?? 0);

  // Fight-desk data: every bout with a full real series (opening → current →
  // live snapshots) plus its Vex AI win probability. The desk reads each tool's
  // inputs straight off this — real market lines and our simulation, no guesses.
  const deskFights: DeskFight[] = rows.flatMap(({ e, m, a, b, sim }) => {
    const series = seriesMap[m.id];
    if (!series || series.length < 2) return [];
    return [{
      id: m.id, eventSlug: e.slug, eventName: shortCardName(e.name),
      weightClass: m.weightClass, rounds: m.rounds, isTitle: !!m.isTitle,
      a: { name: a.name, slug: a.slug, flag: a.flag, country: a.country },
      b: { name: b.name, slug: b.slug, flag: b.flag, country: b.country },
      series, simProbA: sim.probA,
    }];
  });

  return (
    <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col px-4 pb-3 pt-4 sm:px-6">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "FightVex UFC Betting Tools",
        url: "https://fightvex.com/betting",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: "Free UFC & MMA betting tools: real odds, value signals, EV, CLV and Kelly bankroll calculators.",
      }} />
      <div className="reveal mb-2.5 shrink-0">
        <h1 className="font-display text-3xl font-bold uppercase sm:text-4xl">The Edge Desk</h1>
        <p className="mt-1 max-w-4xl text-sm text-muted">
          <strong className="text-fg">Real market moneylines</strong> ({ODDS_SOURCE}) beside Vex AI&apos;s win
          probability; <strong className="text-edge">value signals</strong> flag where the model diverges from the
          real no-vig market. Informational only — not betting advice. 21+.
        </p>
      </div>

      <BettingStage
        boardSections={boardSections}
        cards={cards}
        pageCardIndex={pageCardIndex}
        tools={<FightDesk fights={deskFights} openSource={ODDS_OPEN_SOURCE} curSource={ODDS_SOURCE} live={liveFeed} />}
      />
    </div>
  );
}

// One bout's row block (label + value flag + the two fighters' lines).
function BoutRow({ row }: { row: BoardRow }) {
  const { e, m, a, b, sim, bestA, bestB, fairA, edge } = row;
  const valueSide = Math.abs(edge) >= 0.04 ? (edge > 0 ? "a" : "b") : null;
  const sideRows = [
    { f: a, odds: bestA, implied: fairA, vex: sim.probA, val: valueSide === "a" },
    { f: b, odds: bestB, implied: 1 - fairA, vex: sim.probB, val: valueSide === "b" },
  ];
  return (
    <div className="border-b border-line-soft last:border-0">
      <div className="flex items-center justify-between gap-2 px-5 pt-1.5">
        <Link href={`/events/${e.slug}#${m.id}`} className="text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-fg">
          {m.weightClass} · {m.rounds}rd{m.isTitle ? " · Title" : ""}
        </Link>
        {valueSide ? (
          <span className="rounded-full border border-edge/40 bg-edge/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-edge">
            Value: {lastName((valueSide === "a" ? a : b).name)} +{pct(Math.abs(edge))}
          </span>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">No edge</span>
        )}
      </div>
      {sideRows.map(({ f, odds, implied, vex, val }, i) => (
        <div
          key={i}
          className={`grid grid-cols-[1.7fr_repeat(4,1fr)] items-center gap-2 px-5 py-1 ${val ? "bg-edge/5" : ""} ${i === 0 ? "pt-1.5" : "pb-2"}`}
        >
          <Link href={`/fighters/${f.slug}`} className="flex min-w-0 items-center gap-2 hover:text-blood">
            <Flag emoji={f.flag} country={f.country} className="h-3 w-[18px] shrink-0 rounded-[2px] border border-black/40" />
            <span className="truncate font-display text-sm font-bold uppercase">{f.name}</span>
            {odds < 0 && <span className="shrink-0 rounded bg-panel-2 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-muted">Fav</span>}
          </Link>
          <span className={`tnum text-right text-sm font-bold ${signClass(odds)}`}>{fmtOdds(odds)}</span>
          <span className="tnum text-right text-sm text-muted">{pct(implied)}</span>
          <span className={`tnum text-right text-sm ${val ? "font-bold text-edge" : "text-fg"}`}>{pct(vex)}</span>
          <span className="tnum text-right text-sm text-fg/80">${(toDecimal(odds) * 100).toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

// Short event date, e.g. "Jun 7".
function shortDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// Short card name — the matchup part, e.g. "UFC Fight Night: Muhammad vs. Bonfim"
// → "Muhammad vs. Bonfim".
function shortCardName(name: string): string {
  return name.includes(":") ? name.slice(name.indexOf(":") + 1).trim() : name;
}

// One screen-sized page of the odds board — belongs to a single fight card,
// named in the header so the three events stay visually distinct.
function BoardSection({ rows, index, total, withDisclaimer }: { rows: BoardRow[]; index: number; total: number; withDisclaimer?: boolean }) {
  const e = rows[0].e;
  return (
    <Panel className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-blood/10 to-transparent px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className="h-4 w-1 shrink-0 rounded-full bg-blood" />
          <Link href={`/events/${e.slug}`} className="truncate font-display text-base font-bold uppercase hover:text-blood">{e.name}</Link>
          <span className="shrink-0 rounded-full border border-line bg-bg/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{shortDate(e.date)}</span>
        </div>
        <span className="shrink-0 text-[11px] text-muted">{total > 1 ? `Page ${index + 1} / ${total}` : "Odds board"}</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[1.7fr_repeat(4,1fr)] gap-2 border-b border-line px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
            <span>Fighter</span>
            <span className="text-right">Moneyline</span>
            <span className="text-right">Implied %</span>
            <span className="text-right">Vex AI %</span>
            <span className="text-right">$100 returns</span>
          </div>
          {rows.map((r) => <BoutRow key={r.m.id} row={r} />)}
        </div>
      </div>
      {withDisclaimer && (
        <div className="p-4"><Disclaimer>Moneylines are the real captured market line; Implied % is the de-vigged market probability; Vex AI % is our model. A &quot;Value&quot; flag marks where the model beats the market by ≥4 points — a research signal, NOT betting advice. 21+.</Disclaimer></div>
      )}
    </Panel>
  );
}
