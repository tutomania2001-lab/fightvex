// ============================================================
// FightVector — formatting & betting math helpers
// ============================================================
import type { FightRecord } from "./types";

export function cmToFtIn(cm: number): string {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return `${ft}'${inch}"`;
}
export function cmToIn(cm: number): string {
  return `${Math.round(cm / 2.54)}"`;
}
export function recordString(r: FightRecord): string {
  return `${r.wins}-${r.losses}-${r.draws}`;
}
export function finishBreakdown(r: FightRecord): string {
  return `${r.ko} KO · ${r.sub} SUB · ${r.dec} DEC`;
}
/** American odds → implied probability (0..1) */
export function impliedProb(american: number): number {
  if (american < 0) return -american / (-american + 100);
  return 100 / (american + 100);
}
export function toDecimal(american: number): number {
  return american > 0 ? american / 100 + 1 : 100 / -american + 1;
}
export function fmtOdds(american: number): string {
  return american > 0 ? `+${american}` : `${american}`;
}
/** Sign semantics used site-wide: positive (+) reads green/good, negative (−) red/bad. */
export function signClass(n: number): string {
  return n >= 0 ? "text-edge" : "text-blood";
}
export function expectedValue(modelProb: number, american: number): number {
  const dec = toDecimal(american);
  return modelProb * (dec - 1) - (1 - modelProb);
}
export function noVigProbA(priceA: number, priceB: number): number {
  const a = impliedProb(priceA);
  const b = impliedProb(priceB);
  return a / (a + b);
}
export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}
export function classnames(...xs: (string | false | null | undefined)[]): string {
  return xs.filter(Boolean).join(" ");
}
export function bestPrice(prices: number[]): number {
  return prices.reduce((best, p) => (toDecimal(p) > toDecimal(best) ? p : best), prices[0]);
}
export function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
export function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
export function lastName(name: string): string {
  return name.split(" ").slice(-1)[0];
}
