// Applies the live-record calibration (Platt) to a model probability. It's a
// monotonic transform — sigmoid(a·logit(p) + b) — so it only adjusts CONFIDENCE,
// never which side is favored. With the default identity fit (a=1, b=0) it's a
// no-op, so the model is unchanged until the public record is large enough for
// gen-calibration.mjs to fit a meaningful, sample-size-shrunk correction.
import { LIVE_CALIBRATION, type LiveCalibration } from "./data/calibration.generated";

const clamp01 = (v: number) => Math.max(1e-6, Math.min(1 - 1e-6, v));
const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function applyCalibration(p: number, cal: LiveCalibration = LIVE_CALIBRATION): number {
  // Identity guard (default / low-data / degenerate fit) → return unchanged.
  if (!cal || !(cal.a > 0) || (cal.a === 1 && cal.b === 0)) return p;
  return sigmoid(cal.a * logit(clamp01(p)) + cal.b);
}
