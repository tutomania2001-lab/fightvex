import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { BACKTEST } from "@/lib/data/backtest.generated";

export const metadata: Metadata = {
  title: "FightVex FAQ — How the UFC AI Predictions & Tools Work",
  description: "Answers about FightVex: how the Vex AI predicts UFC fights, how accurate it is, free vs Pro, how picks are verified, where the data comes from, and responsible-gambling info. 21+.",
  alternates: { canonical: "/faq" },
};

const acc = Math.round((BACKTEST.accuracy ?? 0.646) * 100);

const QA: { q: string; a: React.ReactNode; plain: string }[] = [
  {
    q: "What is FightVex?",
    plain: "FightVex is a website where an AI simulates every UFC fight thousands of times to predict the winner, method and round, and gives fans and bettors transparent tools plus a public, verifiable track record.",
    a: <>FightVex is a website where an AI <b className="text-fg">simulates every UFC fight</b> thousands of times to predict who wins, how and when — and hands you the tools (<Link href="/simulator" className="text-blue hover:underline">simulator</Link>, <Link href="/betting" className="text-blue hover:underline">betting tools</Link>, <Link href="/upsets" className="text-blue hover:underline">upset radar</Link>) plus a public, verifiable record.</>,
  },
  {
    q: "How does the Vex AI model predict fights?",
    plain: "It builds a transparent skill rating for each fighter from real fight statistics, runs a round-by-round Monte-Carlo simulation 50,000 times, calibrates the probabilities against thousands of real results, and adjusts for fight-week signals like short notice, missed weight and injuries.",
    a: <>It builds a transparent skill rating for each fighter from <b className="text-fg">real fight statistics</b>, runs a round-by-round simulation <b className="text-fg">50,000 times</b>, calibrates the odds against thousands of real results, and adjusts for fight-week signals (short notice, missed weight, injuries). Full detail on the <Link href="/methodology" className="text-blue hover:underline">methodology page</Link>.</>,
  },
  {
    q: "How accurate is it?",
    plain: `In a leakage-free backtest the model picks the winner about ${acc}% of the time across more than 10,000 real bouts, and it is well-calibrated. Predictions are probabilities, not guarantees.`,
    a: <>In a leakage-free backtest the model picks the winner about <b className="text-edge">{acc}%</b> of the time across 10,000+ real bouts, and it is well-calibrated. See the live, pre-registered <Link href="/accuracy" className="text-blue hover:underline">accuracy record</Link>. Predictions are probabilities, not guarantees — fights are uncertain by nature.</>,
  },
  {
    q: "Is FightVex betting advice?",
    plain: "No. FightVex provides informational analytics only. It does not accept wagers or guarantee outcomes. It is for users aged 21 and over. Please gamble responsibly.",
    a: <>No. FightVex provides <b className="text-fg">informational analytics only</b> — it does not accept wagers or guarantee outcomes, and it is strictly 21+. Please see our <Link href="/responsible-gambling" className="text-blue hover:underline">responsible-gambling resources</Link>.</>,
  },
  {
    q: "What's free and what's Pro?",
    plain: "Free accounts can browse fighters, cards and real odds, read the free pick of the week, and run one real simulation. Pro unlocks unlimited simulations, every fight's full prediction, all betting tools, the bet log and alerts, for £10 per month or £100 per year with a 7-day free trial.",
    a: <>Free: browse fighters, cards and real odds, the <Link href="/free-pick" className="text-blue hover:underline">free pick of the week</Link>, and <b className="text-fg">one</b> real simulation. <Link href="/pricing" className="text-blue hover:underline">Pro</Link> unlocks unlimited sims, every full prediction, all betting tools, the bet log and alerts — £10/mo or £100/yr, with a 7-day free trial. Cancel anytime.</>,
  },
  {
    q: "How do I know the picks aren't back-dated?",
    plain: "Every pick is logged before the fight, and each card's full pick-set is hashed and timestamped on the Bitcoin blockchain, so anyone can prove the picks existed before the event. Wins and losses both stay on the public record.",
    a: <>Every pick is logged <b className="text-fg">before</b> the fight, and each card's pick-set is hashed and timestamped on the <b className="text-fg">Bitcoin blockchain</b> — so anyone can prove they weren't back-dated. Wins and losses both stay on the <Link href="/accuracy" className="text-blue hover:underline">record</Link>.</>,
  },
  {
    q: "What is closing-line value (CLV)?",
    plain: "Closing-line value measures whether a pick was made at a better price than where the betting market closed. Consistently beating the closing line is the strongest evidence of a real betting edge, and FightVex tracks it on the accuracy page.",
    a: <>CLV measures whether a pick beat the price the market <b className="text-fg">closed</b> at — the strongest evidence of a real edge. We track the model's CLV on the <Link href="/accuracy" className="text-blue hover:underline">accuracy page</Link>.</>,
  },
  {
    q: "Where does the data come from?",
    plain: "Fighter statistics and results come from real, public sources. FightVex never fabricates statistics or accuracy; where a number isn't available it is clearly labelled as an estimate. Only the simulation itself is modelled.",
    a: <>Fighter stats and results come from <b className="text-fg">real public sources</b>. We never fabricate numbers; unavailable stats are labelled as estimates. Only the simulation itself is modelled.</>,
  },
  {
    q: "Which promotions does FightVex cover?",
    plain: "FightVex currently covers the UFC. The same engine can extend to other promotions over time.",
    a: <>Currently the <b className="text-fg">UFC</b>. The same engine can extend to other promotions over time.</>,
  },
  {
    q: "Is my account secure and can I cancel anytime?",
    plain: "Yes. Passwords are hashed, sessions can be revoked instantly, and accounts are protected by rate-limiting, lockout, CSRF protection and a strict content-security policy. You own your data and can cancel or delete anytime.",
    a: <>Yes — passwords are hashed, sessions are revocable, and accounts are protected by rate-limiting, lockout, CSRF and a strict CSP (see <Link href="/security" className="text-blue hover:underline">security</Link>). You own your data and can cancel or delete anytime.</>,
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: QA.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.plain } })),
      }} />
      <div className="reveal">
        <h1 className="font-display text-3xl font-bold uppercase sm:text-4xl">Frequently asked <span className="text-blood">questions</span></h1>
        <p className="mt-2 text-muted">Everything about how FightVex works — the AI, the accuracy, the tools and the fine print.</p>
      </div>
      <div className="reveal-stagger mt-8 space-y-3">
        {QA.map((x) => (
          <details key={x.q} className="reveal panel rounded-xl p-5 [&_svg]:open:rotate-180">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="font-display text-base font-bold uppercase tracking-wide">{x.q}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted transition-transform" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{x.a}</p>
          </details>
        ))}
      </div>
      <div className="reveal mt-8 text-center text-sm text-muted">
        Still curious? Try the <Link href="/free-pick" className="text-blood hover:underline">free pick of the week</Link> or run a <Link href="/simulator" className="text-blood hover:underline">simulation</Link>.
      </div>
    </div>
  );
}
