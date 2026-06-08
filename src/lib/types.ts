// ============================================================
// FightVex — Core domain types
// NOTE: Fighter identity, bios, records, events and cards are
// REAL, sourced from the ESPN public MMA API. Deep analytics
// (SLpM, TD%, control, etc.) and betting lines are transparent
// MODEL ESTIMATES — ESPN does not expose granular MMA stats or
// odds for most cards. Not betting advice. 21+.
// ============================================================

export type WeightClass =
  | "Flyweight"
  | "Bantamweight"
  | "Featherweight"
  | "Lightweight"
  | "Welterweight"
  | "Middleweight"
  | "Light Heavyweight"
  | "Heavyweight"
  | "Women's Strawweight"
  | "Women's Flyweight"
  | "Women's Bantamweight";

export type Stance = "Orthodox" | "Southpaw" | "Switch";
export type Severity = "low" | "med" | "high";
export type Confidence = "Low" | "Medium" | "High";

export interface FightRecord {
  wins: number;
  losses: number;
  draws: number;
  ko: number;
  sub: number;
  dec: number;
}

export interface FighterStats {
  slpm: number;
  strAcc: number;
  sapm: number;
  strDef: number;
  tdAvg: number;
  tdAcc: number;
  tdDef: number;
  subAvg: number;
  ctrl: number;
  kdAvg: number;
  cardio: number;
  durability: number;
  finishRate: number;
}

export interface RiskFlag {
  type: string;
  label: string;
  severity: Severity;
  source: string;
  confidence: Confidence;
  updated: string;
}

export interface FormEntry {
  opponent: string;
  result: "W" | "L" | "D" | "NC";
  method: string;
  round: number;
  date: string;
  rating: number;
}

export interface Fighter {
  id: string;
  slug: string;
  name: string;
  nickname?: string;
  country: string;
  flag: string;
  age: number;
  heightCm: number;
  reachCm: number;
  stance: Stance;
  weightClass: WeightClass;
  gym?: string;
  /** Optional real portrait (transparent PNG in /public/fighters). Falls back to the silhouette. */
  image?: string;
  ranking?: number;
  champion?: boolean;
  /** Real championship title from ESPN rankings, e.g. "UFC Welterweight Champion". Undefined if not a champion. */
  title?: string;
  record: FightRecord;
  stats: FighterStats;
  /** True when striking/grappling stats are computed from REAL ESPN per-fight statistics (statsFromAgg); false when model-estimated (no ESPN fight data). */
  statsReal: boolean;
  strengths: string[];
  weaknesses: string[];
  styleSummary: string;
  oppQuality: number;
  layoffMonths: number;
  form: FormEntry[];
  riskFlags: RiskFlag[];
}

export interface OddsLine {
  book: string;
  region: string;
  priceA: number;
  priceB: number;
  capturedAt: string;
}

export interface Matchup {
  id: string;
  fighterA: string;
  fighterB: string;
  weightClass: WeightClass;
  rounds: 3 | 5;
  isMain: boolean;
  isTitle?: boolean;
  boutOrder: number;
  /** Fighter took the bout on short notice (fed from fight-week news, not the data feed) → prep debuff in the sim. */
  shortNoticeA?: boolean;
  shortNoticeB?: boolean;
  /** Fighter missed weight at the weigh-in (fed from fight-week news) → drained debuff in the sim. */
  missedWeightA?: boolean;
  missedWeightB?: boolean;
  /** Fighter entered with a reported injury/illness (fight-week news) → modest debuff in the sim. */
  injuredA?: boolean;
  injuredB?: boolean;
  odds: OddsLine[];
  /** Set when `odds` are REAL web-sourced market lines (e.g. "Market consensus · Jun 2026"). Undefined => model-implied. */
  oddsSource?: string;
  lineHistory: { t: string; impliedA: number }[];
  publicSentimentA?: number;
  keyFactors: string[];
}

export interface FightEvent {
  id: string;
  slug: string;
  name: string;
  org: string;
  date: string;
  venue: string;
  city: string;
  country: string;
  broadcast: string;
  status: "upcoming" | "live" | "completed";
  matchups: Matchup[];
}

export type ImpactDimension =
  | "Striking"
  | "Grappling"
  | "Cardio"
  | "Durability"
  | "Preparation"
  | "Betting Market";

export interface InsightCard {
  id: string;
  headline: string;
  summary: string;
  fighterSlug?: string;
  eventSlug?: string;
  type: "Announcement" | "Injury" | "Weigh-in" | "Odds" | "Camp" | "Replacement" | "Analysis";
  source: string;
  sourceType: "Licensed API" | "Official" | "Public Record" | "News (attributed)" | "User-submitted";
  recency: string;
  confidence: Confidence;
  impact: ImpactDimension[];
  impactScore: number;
}
