import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";

export const metadata: Metadata = {
  title: "Responsible Gambling",
  description: "FightVex is an analytics platform, not a sportsbook. Bet within your means — bankroll guidance, warning signs and where to get help. 21+.",
  alternates: { canonical: "/responsible-gambling" },
};

export default function ResponsibleGamblingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Badge variant="amber">Responsible Gambling</Badge>
      <h1 className="mt-3 font-display text-4xl font-bold uppercase sm:text-5xl">Play it smart</h1>
      <p className="mt-3 text-muted">
        FightVex is an analytics and research platform. We do not accept wagers. Our
        tools are designed to inform decisions, never to pressure you into them.
      </p>

      <Panel className="reveal mt-6 p-6">
        <h2 className="mb-3 font-display text-xl font-bold uppercase">Our commitments</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
          <li>We never promise guaranteed profits or &quot;locks.&quot;</li>
          <li>All predictions are probabilistic and clearly labeled as research/entertainment.</li>
          <li>We surface bankroll tools and loss-limit guidance, not bigger-bet nudges.</li>
          <li>Affiliate sportsbook links, where present, are clearly disclosed and region-aware.</li>
          <li>Our content is restricted to adults of legal age (21+ in many regions).</li>
        </ul>
      </Panel>

      <Panel className="reveal mt-6 p-6">
        <h2 className="mb-3 font-display text-xl font-bold uppercase">Warning signs</h2>
        <p className="text-sm text-muted">Betting more than you can afford, chasing losses, borrowing to bet, hiding betting from family, or feeling anxious about it are all signs to step back. Set deposit and time limits, and treat any betting budget as entertainment money you can afford to lose.</p>
      </Panel>

      <Panel className="reveal mt-6 p-6">
        <h2 className="mb-3 font-display text-xl font-bold uppercase">Get help</h2>
        <ul className="space-y-2 text-sm text-muted">
          <li><b className="text-fg">US:</b> Call or text 1-800-GAMBLER · <span className="text-edge">ncpgambling.org</span></li>
          <li><b className="text-fg">UK:</b> GamCare — 0808 8020 133 · <span className="text-edge">gamcare.org.uk</span></li>
          <li><b className="text-fg">EU/Other:</b> Contact your local or national problem-gambling service.</li>
        </ul>
      </Panel>
    </div>
  );
}
