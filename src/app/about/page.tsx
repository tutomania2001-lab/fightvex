import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { BACKTEST } from "@/lib/data/backtest.generated";

export const metadata: Metadata = {
  title: "About FightVex — Transparent AI Fight Intelligence for the UFC",
  description:
    "What FightVex is, in plain English: a transparent AI that simulates UFC fights to estimate who wins and how, built on real data — plus betting research tools. Not a sportsbook, not betting advice. 21+.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const acc = Math.round(BACKTEST.accuracy * 100);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">About FightVex</h1>

      {/* Plain-English intro — written so anyone gets it in 20 seconds. */}
      <div className="mt-4 space-y-4 text-lg leading-relaxed text-fg/90">
        <p>
          <b>FightVex is a website that uses AI to predict UFC fights — and shows its work.</b> Pick any two fighters and
          our engine, &quot;Vex AI,&quot; plays out the fight thousands of times to estimate <b>who is likely to win, how
          (knockout, submission or decision), and in which round</b> — then explains <i>why</i>, in numbers you can check.
        </p>
        <p>
          Think of it as a transparent analyst for combat sports. Most prediction sites just hand you a number and ask you
          to trust it. We do the opposite: every rating, every data source, and our real accuracy track record are open for
          you to inspect. On top of the predictions, we offer professional-grade <b>research tools for people who follow the
          betting markets</b> — but FightVex is not a sportsbook and never takes a wager.
        </p>
      </div>

      <Section title="What you can do here">
        <ul className="list-disc space-y-2 pl-5">
          <li><b>Simulate any matchup.</b> The <Link href="/simulator" className="text-blood hover:underline">AI Simulator</Link> gives a win probability, the likely method and round, a round-by-round breakdown, and the key factors driving it.</li>
          <li><b>Explore the fighters.</b> Real records, rankings, bios and per-fight statistics in the <Link href="/fighters" className="text-blood hover:underline">fighter library</Link>, and a head-to-head <Link href="/compare" className="text-blood hover:underline">compare</Link> view.</li>
          <li><b>Follow the cards.</b> Upcoming UFC <Link href="/events" className="text-blood hover:underline">events</Link> with the full fight card and Vex AI&apos;s read on every bout.</li>
          <li><b>Study the market.</b> The <Link href="/betting" className="text-blood hover:underline">Edge Desk</Link> shows real moneylines beside our model, a line-movement tracker, and calculators for expected value, closing-line value and bankroll/Kelly staking.</li>
          <li><b>Check our honesty.</b> The <Link href="/methodology" className="text-blood hover:underline">methodology</Link> explains exactly how the model works, and the <Link href="/accuracy" className="text-blood hover:underline">accuracy record</Link> grades our public picks against real results.</li>
        </ul>
      </Section>

      <Section title="How the prediction engine works">
        <p>
          Vex AI doesn&apos;t let one rating decide a fight. It builds each fighter&apos;s profile from real statistics, then
          runs a <b>style-aware, round-by-round simulation thousands of times</b> — modelling where the fight happens
          (standing vs the ground), fatigue, accumulated damage and the paths to a finish. Aggregating those runs gives the
          win probability, the method-of-victory split and the round-by-round picture, always with a confidence range
          because MMA is genuinely unpredictable.
        </p>
        <p>
          And it&apos;s tested, not just asserted. We <b>back-tested the engine against {BACKTEST.backtested.toLocaleString()} real
          UFC bouts</b> (drawn from {BACKTEST.fighters.toLocaleString()} fighters, {BACKTEST.yearFrom}–{BACKTEST.yearTo}),
          rebuilding each fighter&apos;s stats from only their <i>earlier</i> fights so there&apos;s no hindsight. It picks
          the winner about <b>{acc}% of the time</b> with well-calibrated probabilities — a realistic figure on a deep,
          upset-heavy history, not an inflated marketing number. Full details are on the{" "}
          <Link href="/methodology" className="text-blood hover:underline">methodology</Link> page.
        </p>
      </Section>

      <Section title="Fighter insight — and a public, verifiable track record">
        <p>
          Beyond the win probability, FightVex reads each fighter&apos;s <b>style from real data</b>. The simulator names a
          matchup&apos;s archetypes — pressure striker, wrestler, submission grappler, counter-striker — and every fighter
          page carries a <b>Striking Profile</b> built from thousands of real UFCStats fights: where a fighter&apos;s strikes
          land (head, body, leg) and from where (distance, clinch, ground). It&apos;s descriptive insight from real fight
          data, clearly labelled — and deliberately <b>kept out of the prediction</b>. We tested whether that detail
          improves who-wins accuracy; it didn&apos;t, so we don&apos;t pretend it does.
        </p>
        <p>
          And our picks are <b>locked before the fights</b>. Each card&apos;s picks are hashed and timestamped in the{" "}
          <b>Bitcoin blockchain</b> before the event — you can recompute that hash in your own browser to prove they were
          never back-dated — then graded against the real results on the{" "}
          <Link href="/accuracy" className="text-blood hover:underline">accuracy record</Link>. Our first live card is
          already on the board.
        </p>
      </Section>

      <Section title="Real data — and a strict no-make-believe rule">
        <p>
          Fighter identities, records, rankings, fight history and the betting odds you see are <b>real data from trusted
          public sources</b> (such as ESPN, official rankings and live market odds). The <b>only</b> modelled numbers on the
          entire site are the clearly-labelled Vex AI simulations. Where a deeper stat isn&apos;t publicly available we
          transparently estimate it from a fighter&apos;s real record and <b>flag it as an estimate</b> — we never dress up a
          guess as a measured fact. Today FightVex focuses on the <b>UFC</b>.
        </p>
      </Section>

      <Section title="Plans">
        <p>
          You can browse and try a live preview for free. A <b>free account</b> unlocks personalisation, and one
          <b> Pro</b> plan unlocks everything — unlimited custom simulations, full fighter profiles and all the
          betting tools (line movement, EV, closing-line value and bankroll/Kelly). Payments are handled by Stripe and
          you can cancel anytime from your account. See{" "}
          <Link href="/pricing" className="text-blood hover:underline">pricing</Link> for current details.
        </p>
      </Section>

      <Section title="What FightVex is NOT">
        <ul className="list-disc space-y-2 pl-5">
          <li><b>Not a sportsbook.</b> We don&apos;t take bets or hold your money for wagering. The tools are for research and education.</li>
          <li><b>Not betting or financial advice,</b> and not a guarantee of any outcome. Predictions are probabilities — favourites lose all the time.</li>
          <li><b>Not affiliated</b> with the UFC, any promotion, or any sportsbook.</li>
          <li><b>Not for minors.</b> 21+. If gambling is affecting you or someone you know, call 1-800-GAMBLER (US) or your local support service.</li>
        </ul>
      </Section>

      <Section title="What we stand for">
        <p>
          <b>Transparency</b> (we show our method and our real track record), <b>honesty</b> (no fabricated stats, no invented
          accuracy claims), <b>responsible play</b> (clear risk framing, never hype), and <b>safety</b> — read exactly how we
          protect your account and payments on our <Link href="/security" className="text-blood hover:underline">Security &amp; Trust</Link> page.
        </p>
        <p className="text-[11px] text-faint">
          FightVex provides informational analytics and probabilistic research/entertainment tools. 21+ · Please play responsibly.
        </p>
      </Section>
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
