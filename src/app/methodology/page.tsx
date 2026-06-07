import type { Metadata } from "next";
import Link from "next/link";
import { WEIGHTS } from "@/lib/sim";
import { BACKTEST } from "@/lib/data/backtest.generated";
import { Panel } from "@/components/ui/Panel";
import { pct } from "@/lib/format";

export const metadata: Metadata = {
  title: "How Vex AI Works — MMA Fight Prediction Methodology",
  description: "Exactly how Vex AI turns real fighter statistics into UFC win probabilities — inputs, category weights, Monte-Carlo simulation, calibration and how we prevent overconfidence.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">How Vex AI works</h1>
      <p className="mt-3 text-muted">
        Transparency is the product. Here is exactly how Vex AI turns
        fighter statistics into probabilities — and how it stays honest about uncertainty.
      </p>

      <Section title="1. Inputs">
        <p>Fighter identities, records, rankings, bios and event cards are <b>real data from trusted public sources</b>. From those we build each fighter&apos;s statistical profile: significant strikes landed/absorbed per minute, striking accuracy/defense, takedowns per 15 and accuracy/defense, submission attempts, control time and knockdowns, plus engineered indices for cardio, durability and finishing ability. Context inputs include reach, stance, age, real layoff (months since the fighter&apos;s last bout) and recent form. Competition (opponent quality) is grounded in real strength-of-schedule — the average win rate of a fighter&apos;s recent opponents — not just a rank or a guess.</p>
        <p>Where a fighter has real aggregated per-fight statistics, we use them. Where those aren&apos;t available, the per-fight stats are <b>transparently estimated</b> from that fighter&apos;s real record and finish profile — deterministic and reproducible, never random — and flagged as estimates in the UI. We never present an estimate as if it were measured.</p>
      </Section>

      <Section title="2. Category sub-scores">
        <p>Raw stats are normalized to 0–100 within weight class, then blended into nine interpretable category sub-scores: Striking, Wrestling, Grappling, Submission, Cardio, Durability, Physical, Form and Competition.</p>
      </Section>

      <Section title="3. Composite rating & win probability">
        <p>The composite rating is a transparent weighted sum of the sub-scores. Win probability uses a logistic (Bradley–Terry-style) function of the rating gap:</p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-bg p-4 text-xs text-edge">{`R   = Σ (weight_c × subscore_c)
P(A) = 1 / (1 + e^( -k × (R_A − R_B) ))`}</pre>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {Object.entries(WEIGHTS).sort((a, b) => b[1] - a[1]).map(([k, w]) => (
            <div key={k} className="flex items-center justify-between rounded-md border border-line bg-panel-2/40 px-3 py-2">
              <span className="text-sm text-fg">{k}</span>
              <span className="tnum text-sm font-semibold text-blood">{pct(w)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="4. Style-aware round-by-round simulation">
        <p>The rating gap above is only a <b>prior</b> — we do not let one composite number decide the fight. We simulate the bout thousands of times, round by round. Each round the model works out <i>where the fight happens</i> (a fighter&apos;s takedown threat against the opponent&apos;s takedown defense → how much of the round is on the ground vs standing), then resolves striking in the standing portion and grappling/control on the ground. So a great striker with weak takedown defense correctly fares worse against an elite wrestler.</p>
        <p>Fatigue accumulates across rounds (worse for low-cardio fighters, so they fade late) and damage carries over (a hurt fighter is more finishable later). Finishes follow coherent paths — a KO from standing dominance, power and a weakened chin; a submission from control plus submission threat against the opponent&apos;s defense. Aggregating the runs yields the method-of-victory split (KO/TKO, submission, decision), the round-by-round breakdown and confidence intervals.</p>
        <p>For the final <b>win probability</b> we go one step further: we <b>ensemble</b> this transparent rating-plus-simulation model 50/50 with a <b>gradient-boosted model</b> trained on the historical bouts below. The boosted model captures non-linear matchups a linear rating can&apos;t (e.g. an elite wrestler against weak takedown defence), and on a leakage-free backtest it improved the probabilities measurably. The transparent model still drives everything you <i>see</i> — the radar, the category contributions, the method/round breakdown and the plain-language drivers — so the explanation always matches the inputs.</p>
      </Section>

      <Section title="5. Preventing overconfidence">
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Uncertainty inflation:</b> probabilities are pulled toward 50% when data is incomplete or the styles are high-variance.</li>
          <li><b>Hard caps:</b> displayed probabilities are clamped (≈8–92%) — MMA is too chaotic for false certainty.</li>
          <li><b>Ranges, not points:</b> every prediction ships with a confidence interval and a volatility tag.</li>
        </ul>
      </Section>

      <Section title="6. Missing data">
        <p>Absent stats are shrunk toward the weight-class mean (a Bayesian prior), the data-completeness meter drops accordingly, and imputed fields are flagged. We never silently fabricate a number.</p>
      </Section>

      <Section title="7. Calibration & accuracy (the honest part)">
        <p>The simulation&apos;s finish hazards are <b>validated against real outcomes</b>: we checked the model&apos;s predicted finish rate against what actually happened across the historical bouts and corrected it until they matched (about half of fights reach a decision, the rest split between KO/TKO and submission). Those finish rates are also <b>weight-class aware</b> — heavyweights finish far more often by knockout than flyweights — using each division&apos;s real historical KO/submission base rates. So the method-of-victory split is calibrated to reality, not invented.</p>
        <p>Two honest checks, never one invented number. <b>(1) Going forward:</b> every Vex AI pick is <b>logged before the fight</b> and graded against the <b>real result</b> afterward — never back-dated; the live number is earned only from graded predictions. Our <b>first live card is now graded</b> (and the model started strong), but a single card is a tiny sample — the live record stays deliberately humble and grows honestly, card after card. See the self-building record on the <Link href="/accuracy" className="text-blood hover:underline">Vex AI accuracy page</Link>. <b>(2) Looking back:</b> the engine is also validated on real history — see the leakage-free backtest in the next section.</p>
      </Section>

      <Section title="8. Backtested on real history">
        <p>
          Beyond the live record, the engine is validated against history. We rebuilt the inputs for{" "}
          <b className="text-fg">{BACKTEST.backtested.toLocaleString()} real UFC bouts</b> ({BACKTEST.yearFrom}–{BACKTEST.yearTo},
          drawn from a dataset of <b className="text-fg">{BACKTEST.fighters.toLocaleString()} fighters</b>) using <b>only each fighter&apos;s
          fights before that date</b> — no hindsight, no leakage — then ran the live engine and compared its pick to the real result.
        </p>
        <div className="my-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat v={pct(BACKTEST.accuracy, 1)} l="Winner accuracy" />
          <Stat v={pct(BACKTEST.accuracyRecent, 1)} l="Recent (held-out)*" />
          <Stat v={BACKTEST.logLoss.toFixed(3)} l="Log-loss (0.69 = coin flip)" />
          <Stat v={BACKTEST.brier.toFixed(3)} l="Brier (0.25 = coin flip)" />
        </div>
        <p>
          This is how the engine was tuned, not just described — by <b>walk-forward validation</b> (train on the past, score the
          future, never the reverse) and bootstrap significance tests. The category weights are <b>data-fitted</b>; the win
          probability is an <b>ensemble</b> of the transparent model and a gradient-boosted model (see section 4) that, on this
          set, beat the transparent model alone on both accuracy and log-loss by a statistically significant margin. The result
          stays well-calibrated: when Vex AI says ~70% it wins ~{Math.round((BACKTEST.calibration.find((c) => c.bucket === "0.6-0.7")?.actual ?? 0.65) * 100)}–{Math.round((BACKTEST.calibration.find((c) => c.bucket === "0.7-0.8")?.actual ?? 0.7) * 100)}% of the time.
          It&apos;s sharpest on clear mismatches and honestly near coin-flip on genuine pick&apos;em fights — because those really
          are. This is a deliberately broad, un-cherry-picked set ({BACKTEST.yearTo - BACKTEST.yearFrom} years, heavy with
          low-profile, upset-prone bouts), so ~{pct(BACKTEST.accuracy, 0)} winner accuracy is a realistic, conservative figure —
          the model does better on well-documented, higher-profile matchups.
        </p>
        <p className="text-[11px] text-faint">
          *Held-out test: the model is tuned only on older fights and scored on the most recent ~30% it never saw. A bout is scored only
          when both fighters have ≥2 prior fights in the data. This historical backtest is separate from — and complements — the live,
          pre-registered <Link href="/accuracy" className="text-blood hover:underline">accuracy record</Link>.
        </p>
      </Section>

      <Section title="9. Explainability">
        <p>For any prediction we show each category&apos;s contribution (weight × skill gap mapped to probability points), the top drivers in plain language, and links back to the underlying stats and sources.</p>
      </Section>

      <p className="reveal mt-8 rounded-lg border border-line bg-panel/60 p-4 text-[11px] leading-relaxed text-muted">
        Vex AI is a probabilistic research and entertainment tool. It is not betting
        or financial advice and does not guarantee outcomes. Deep analytics and odds
        shown are Vex AI estimates. 21+.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel className="reveal mt-6 p-6">
      <h2 className="mb-3 font-display text-xl font-bold uppercase">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted">{children}</div>
    </Panel>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-md border border-line bg-panel-2/40 p-3 text-center">
      <p className="font-display text-2xl font-bold text-edge">{v}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">{l}</p>
    </div>
  );
}
