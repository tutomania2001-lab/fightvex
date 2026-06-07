// ============================================================
// FightVex — REAL moneyline odds (web-sourced, June 2026).
//
// Captured from public sportsbook/aggregator data for the current
// card (Oddsshark, UFC.com, BestFightOdds, MMAOddsBreaker), reconciled
// to a market-consensus line per bout. American moneyline, oriented to
// our bout's fighterA / fighterB. These are REAL lines (not model-
// implied); the Vex AI value signals compare our model probability
// against THIS real no-vig market. Refresh before each event.
//
// Keyed by ESPN bout id (b1..bN, see espn.generated.ts REAL_EVENT).
// ============================================================
export interface RealOddsLine {
  oddsA: number;
  oddsB: number;
  /** Real OPENING line (American), oriented A/B — used by the Line Movement Tracker. */
  openA?: number;
  openB?: number;
}

export const ODDS_CAPTURED = "2026-06-02";
export const ODDS_SOURCE = "Market consensus · Oddsshark / UFC.com / BestFightOdds";
export const ODDS_OPEN_SOURCE = "Opening line · MMAOddsBreaker / FightOdds.io";

// Current consensus line + the real opening line per bout (open → current = movement).
export const REAL_ODDS: Record<string, RealOddsLine> = {
  b1: { oddsA: -142, oddsB: 120, openA: 130, openB: -150 },    // Belal Muhammad / Gabriel Bonfim
  b2: { oddsA: -245, oddsB: 186, openA: -350, openB: 285 },    // Brendan Allen / Edmen Shahbazyan
  b3: { oddsA: -320, oddsB: 235, openA: -185, openB: 160 },    // Farés Ziam / Tom Nolan
  b4: { oddsA: -161, oddsB: 119, openA: -250, openB: 210 },    // Bryce Mitchell / Santiago Luna
  b5: { oddsA: 220, oddsB: -260, openA: -260, openB: 220 },    // Junior Tafa / Iwo Baraniewski (favorite flipped)
  b6: { oddsA: 400, oddsB: -550, openA: 400, openB: -550 },    // Matt Schnell / Alessandro Costa
  b7: { oddsA: -450, oddsB: 350, openA: -450, openB: 350 },    // Marcus McGhee / John Yannis
  b8: { oddsA: -132, oddsB: 104, openA: -110, openB: -110 },   // Bruno Silva / Édgar Cháirez
  b9: { oddsA: 150, oddsB: -175, openA: 150, openB: -175 },    // Priscila Cachoeira / Chelsea Chandler
  b10: { oddsA: -194, oddsB: 150, openA: -270, openB: 230 },   // Joanderson Brito / Jordan Leavitt
  b11: { oddsA: 310, oddsB: -400, openA: 600, openB: -900 },   // Yuneisy Duben / Jeisla Chaves
  b12: { oddsA: 215, oddsB: -265, openA: 250, openB: -300 },   // Ariane Carnelossi / Ketlen Souza
};

export function realOddsFor(boutId: string): RealOddsLine | undefined {
  return REAL_ODDS[boutId];
}
