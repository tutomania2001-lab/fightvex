// Plain-English "why" for a Vex AI pick. PURELY derived from the engine's own
// output — the ranked factor edges (sim.factors), the method/round headline, the
// variance flag and each fighter's REAL stats. No fabrication, no LLM: every
// number traces to model output, so it stays on-brand with "real data only".
import type { SimResult } from "./sim";
import type { Fighter } from "./types";
import { lastName } from "./format";

type Factor = SimResult["factors"][number];

export function pickRationale(sim: SimResult, a: Fighter, b: Fighter): string {
  const favA = sim.probA >= 0.5;
  const fav = favA ? a : b;
  const dog = favA ? b : a;
  const favProb = Math.round((favA ? sim.probA : 1 - sim.probA) * 100);
  const favL = lastName(fav.name);
  const dogL = lastName(dog.name);
  const fs = fav.stats, ds = dog.stats;

  // factor.delta is signed toward A; a factor "favours the favourite" when its
  // sign matches the favoured side.
  const favorsFav = (f: Factor) => (favA ? f.delta > 0 : f.delta < 0);
  const ranked = [...sim.factors].sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  const favFactors = ranked.filter((f) => favorsFav(f) && Math.abs(f.delta) > 0.1);
  const dogFactors = ranked.filter((f) => !favorsFav(f) && Math.abs(f.delta) > 0.1);

  const area = (f: Factor): string => {
    const l = f.label.toLowerCase();
    if (l.includes("striking")) return "striking";
    if (l.includes("power")) return "power and finishing";
    if (l.includes("takedown")) return "wrestling";
    if (l.includes("submission")) return "submission grappling";
    if (l.includes("cardio")) return "cardio";
    if (l.includes("durability")) return "durability";
    if (l.includes("experience")) return "experience and fight IQ";
    if (l.includes("layoff")) return "ring rust";
    if (l.includes("short")) return "short-notice prep";
    if (l.includes("weight")) return "the weight miss";
    if (l.includes("injury")) return "an injury concern";
    return l;
  };

  const detail = (f: Factor): string => {
    const l = f.label.toLowerCase();
    if (l.includes("striking")) return `${favL} lands ${fs.slpm}/min at ${fs.strAcc}% accuracy against ${dogL}'s ${ds.strDef}% defense`;
    if (l.includes("power")) return `${favL} averages ${fs.kdAvg} knockdowns per 15 min with a ${fs.finishRate}% finish rate`;
    if (l.includes("takedown")) return `${favL} brings ${fs.tdAvg} takedowns per 15 and ${fs.tdDef}% takedown defense`;
    if (l.includes("submission")) return `${favL} threatens ${fs.subAvg} submission attempts per 15`;
    if (l.includes("cardio")) return `${favL} rates ${fs.cardio} for conditioning to ${dogL}'s ${ds.cardio} late`;
    if (l.includes("durability")) return `${favL} rates ${fs.durability} for durability, absorbing only ${fs.sapm}/min`;
    if (l.includes("experience")) return `${favL} owns the edge in cage experience and fight IQ`;
    if (l.includes("layoff")) return `${dogL} carries ring rust after a long layoff`;
    if (l.includes("short")) return `${dogL} took this on short notice`;
    if (l.includes("weight")) return `${dogL} missed weight and comes in drained`;
    if (l.includes("injury")) return `${dogL} enters with a reported injury`;
    return area(f);
  };

  const m = sim.headline.method;
  const round = sim.headline.round ? ` around round ${sim.headline.round}` : "";
  const methodSentence =
    m === "Decision"
      ? "The model leans toward a decision."
      : `The model leans toward a ${m === "KO/TKO" ? "KO/TKO" : m.toLowerCase()}${round}.`;

  const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs[0]);

  const parts: string[] = [];
  parts.push(favProb < 56 ? `Vex AI sees a close one, leaning ${fav.name} at ${favProb}%.` : `Vex AI favors ${fav.name} at ${favProb}%.`);

  if (favFactors[0]) parts.push(`The biggest edge is ${area(favFactors[0])} — ${detail(favFactors[0])}.`);
  else parts.push("The edges are marginal across the board.");

  const secondAreas = [...new Set(favFactors.slice(1, 3).map(area))];
  if (secondAreas.length) parts.push(`${favL} also holds the advantage in ${list(secondAreas)}.`);

  parts.push(methodSentence);
  if (dogFactors[0]) parts.push(`Main risk: ${dogL}'s ${area(dogFactors[0])}.`);
  if (sim.variance === "HIGH") parts.push("It's a high-variance matchup, so treat the edge with caution.");

  return parts.join(" ");
}
