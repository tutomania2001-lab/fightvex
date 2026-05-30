import type { Metadata } from "next";
import { WEIGHTS } from "@/lib/sim";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { pct } from "@/lib/format";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How the FightVector model works — inputs, weights, calibration, and how we prevent overconfidence.",
};

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Badge variant="blood">Methodology</Badge>
      <h1 className="mt-3 font-display text-4xl font-bold uppercase sm:text-5xl">How the model works</h1>
      <p className="mt-3 text-muted">
        Transparency is the product. Here is exactly how our simulation engine turns
        fighter statistics into probabilities — and how it stays honest about uncertainty.
      </p>

      <Section title="1. Inputs">
        <p>Each fighter is described by a statistical profile sourced (in production) from licensed and official feeds: significant strikes landed/absorbed per minute, striking accuracy/defense, takedowns per 15 and accuracy/defense, submission attempts, control time, knockdowns, plus engineered indices for cardio, durability and finishing ability. Context inputs include reach, stance, age, layoff duration, recent form and opponent quality.</p>
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

      <Section title="4. Method & rounds (Monte Carlo)">
        <p>We simulate the bout hundreds-to-thousands of times. Each round carries a finish hazard scaled by the leader&apos;s finishing ability against the opponent&apos;s durability; unfinished fights go to a decision. Aggregating runs yields method-of-victory distribution (KO/TKO, submission, decision), round momentum, and empirical confidence intervals.</p>
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

      <Section title="7. Updating after real results">
        <p>Every pre-fight probability is logged immutably. After results we compute Brier score and log-loss, plot reliability curves, apply Platt/isotonic recalibration on a rolling window, and periodically refit weights. Each change ships as a new model version with a public accuracy record.</p>
      </Section>

      <Section title="8. Explainability">
        <p>For any prediction we show each category&apos;s contribution (weight × skill gap mapped to probability points), the top drivers in plain language, and links back to the underlying stats and sources.</p>
      </Section>

      <p className="mt-8 rounded-lg border border-line bg-panel/60 p-4 text-[11px] leading-relaxed text-muted">
        This model is a probabilistic research and entertainment tool. It is not betting
        or financial advice and does not guarantee outcomes. Sample data used throughout
        the demo is fictional. 21+.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel className="mt-6 p-6">
      <h2 className="mb-3 font-display text-xl font-bold uppercase">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted">{children}</div>
    </Panel>
  );
}
