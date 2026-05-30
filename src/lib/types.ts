// ============================================================
// FightVector — Core domain types
// NOTE: All fighter data in this project is FICTIONAL sample
// data used to demonstrate the product. A production build
// would source stats from licensed/official/compliant feeds.
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
  ranking?: number;
  champion?: boolean;
  record: FightRecord;
  stats: FighterStats;
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
  odds: OddsLine[];
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
