// ============================================================
// FightVector — FICTIONAL sample events / cards / odds
// Promotion ("Vanguard FC") and odds are invented for demo.
// Production would use licensed odds + event feeds.
// ============================================================
import type { FightEvent, Matchup } from "../types";

function lineHistory(start: number, end: number, points = 8): { t: string; impliedA: number }[] {
  const out = [];
  for (let i = 0; i < points; i++) {
    const f = i / (points - 1);
    const v = start + (end - start) * f + (i % 2 === 0 ? 0.006 : -0.006);
    out.push({ t: `T-${points - i}d`, impliedA: Math.round(v * 1000) / 1000 });
  }
  return out;
}

const EVENTS: FightEvent[] = [
  {
    id: "e1",
    slug: "vanguard-fc-14",
    name: "Vanguard FC 14: Morales vs Petrov",
    org: "Vanguard FC",
    date: "2026-06-13T22:00:00Z",
    venue: "Apex Arena",
    city: "Las Vegas",
    country: "USA",
    broadcast: "VanguardTV PPV",
    status: "upcoming",
    matchups: [
      {
        id: "m1", fighterA: "f1", fighterB: "f2", weightClass: "Lightweight", rounds: 5, isMain: true, isTitle: true, boutOrder: 1,
        odds: [
          { book: "BetForge", region: "US", priceA: -165, priceB: 140, capturedAt: "T-1d" },
          { book: "OddsVault", region: "US", priceA: -158, priceB: 134, capturedAt: "T-1d" },
          { book: "LineKing", region: "UK", priceA: -172, priceB: 145, capturedAt: "T-1d" },
        ],
        lineHistory: lineHistory(0.58, 0.62), publicSentimentA: 71,
        keyFactors: [
          "Title rematch — Morales won the first meeting by R4 TKO",
          "Petrov's wrestling (4.8 TD/15) vs Morales' 58% TD defense",
          "Championship rounds favor Morales' elite cardio",
          "Petrov returning from an 8-month layoff",
        ],
      },
      {
        id: "m2", fighterA: "f7", fighterB: "f8", weightClass: "Welterweight", rounds: 5, isMain: true, isTitle: true, boutOrder: 2,
        odds: [
          { book: "BetForge", region: "US", priceA: -240, priceB: 195, capturedAt: "T-1d" },
          { book: "OddsVault", region: "US", priceA: -225, priceB: 185, capturedAt: "T-1d" },
          { book: "LineKing", region: "UK", priceA: -250, priceB: 200, capturedAt: "T-1d" },
        ],
        lineHistory: lineHistory(0.66, 0.71), publicSentimentA: 68,
        keyFactors: [
          "Adeyemi rematches the only man to test his grappling",
          "Ferreira (3.0 sub/15) is a constant submission threat",
          "Adeyemi's 78% TD defense is the key swing stat",
        ],
      },
      {
        id: "m3", fighterA: "f3", fighterB: "f5", weightClass: "Lightweight", rounds: 3, isMain: true, boutOrder: 3,
        odds: [
          { book: "BetForge", region: "US", priceA: 125, priceB: -145, capturedAt: "T-1d" },
          { book: "OddsVault", region: "US", priceA: 132, priceB: -150, capturedAt: "T-1d" },
          { book: "LineKing", region: "UK", priceA: 120, priceB: -140, capturedAt: "T-1d" },
        ],
        lineHistory: lineHistory(0.46, 0.43), publicSentimentA: 58,
        keyFactors: [
          "Classic striker-vs-technician style clash",
          "Tanaka's power vs Souleymane's 64% striking defense",
          "If it goes 15 minutes, the cards likely favor Souleymane",
        ],
      },
      {
        id: "m4", fighterA: "f9", fighterB: "f12", weightClass: "Welterweight", rounds: 3, isMain: true, boutOrder: 4,
        odds: [
          { book: "BetForge", region: "US", priceA: -130, priceB: 110, capturedAt: "T-1d" },
          { book: "OddsVault", region: "US", priceA: -135, priceB: 115, capturedAt: "T-1d" },
        ],
        lineHistory: lineHistory(0.55, 0.56), publicSentimentA: 62,
        keyFactors: [
          "Nwosu's KO power vs Vásquez's grinding top game",
          "Can Vásquez drag the knockout artist into deep water?",
        ],
      },
      {
        id: "m5", fighterA: "f10", fighterB: "f11", weightClass: "Women's Bantamweight", rounds: 5, isMain: true, isTitle: true, boutOrder: 5,
        odds: [
          { book: "BetForge", region: "US", priceA: -185, priceB: 155, capturedAt: "T-1d" },
          { book: "OddsVault", region: "US", priceA: -190, priceB: 160, capturedAt: "T-1d" },
        ],
        lineHistory: lineHistory(0.62, 0.65), publicSentimentA: 64,
        keyFactors: [
          "Vega's pace vs Ivanova's one-shot left hand",
          "Ivanova returning from an 11-month layoff (high risk flag)",
        ],
      },
      {
        id: "m6", fighterA: "f4", fighterB: "f6", weightClass: "Lightweight", rounds: 3, isMain: false, boutOrder: 6,
        odds: [
          { book: "BetForge", region: "US", priceA: -110, priceB: -110, capturedAt: "T-1d" },
          { book: "OddsVault", region: "US", priceA: -105, priceB: -115, capturedAt: "T-1d" },
        ],
        lineHistory: lineHistory(0.51, 0.5), publicSentimentA: 53,
        keyFactors: [
          "Okafor's reach vs Cole's veteran pressure",
          "Pick'em fight — both coming off losses",
        ],
      },
    ],
  },
  {
    id: "e2",
    slug: "vanguard-fc-fight-night-okafor",
    name: "Vanguard FC Fight Night: Okafor vs Vásquez",
    org: "Vanguard FC",
    date: "2026-07-25T23:00:00Z",
    venue: "Steel Hall",
    city: "London",
    country: "UK",
    broadcast: "VanguardTV",
    status: "upcoming",
    matchups: [
      {
        id: "m7", fighterA: "f4", fighterB: "f12", weightClass: "Lightweight", rounds: 5, isMain: true, boutOrder: 1,
        odds: [
          { book: "BetForge", region: "UK", priceA: 105, priceB: -125, capturedAt: "T-1d" },
          { book: "LineKing", region: "UK", priceA: 110, priceB: -130, capturedAt: "T-1d" },
        ],
        lineHistory: lineHistory(0.49, 0.47), publicSentimentA: 49,
        keyFactors: ["Striker vs grappler main event", "Okafor's reach advantage is significant (196cm)"],
      },
      {
        id: "m8", fighterA: "f6", fighterB: "f3", weightClass: "Lightweight", rounds: 3, isMain: true, boutOrder: 2,
        odds: [{ book: "BetForge", region: "UK", priceA: 320, priceB: -400, capturedAt: "T-1d" }],
        lineHistory: lineHistory(0.26, 0.23), publicSentimentA: 31,
        keyFactors: ["Tanaka heavily favored on power", "Cole's durability question vs a one-shot finisher"],
      },
    ],
  },
];

export function allEvents(): FightEvent[] {
  return EVENTS;
}
export function upcomingEvents(): FightEvent[] {
  return EVENTS.filter((e) => e.status === "upcoming");
}
export function getEvent(slug: string): FightEvent | undefined {
  return EVENTS.find((e) => e.slug === slug);
}
export function getMatchup(id: string): { event: FightEvent; matchup: Matchup } | undefined {
  for (const e of EVENTS) {
    const m = e.matchups.find((mm) => mm.id === id);
    if (m) return { event: e, matchup: m };
  }
  return undefined;
}
export function nextEvent(): FightEvent {
  return upcomingEvents()[0];
}
