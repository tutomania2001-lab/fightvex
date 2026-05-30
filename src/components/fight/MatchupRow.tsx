import Link from "next/link";
import type { Matchup } from "@/lib/types";
import { getFighterById } from "@/lib/data/fighters";
import { simulate } from "@/lib/sim";
import { FighterAvatar } from "../fighter/FighterAvatar";
import { Badge } from "../ui/Badge";
import { Sparkline } from "../ui/Sparkline";
import { recordString, impliedProb, noVigProbA, bestPrice, fmtOdds, pct, lastName } from "@/lib/format";

export function MatchupRow({ matchup }: { matchup: Matchup }) {
  const a = getFighterById(matchup.fighterA)!;
  const b = getFighterById(matchup.fighterB)!;
  const sim = simulate(a, b, { rounds: matchup.rounds, runs: 600 });

  const bestA = bestPrice(matchup.odds.map((o) => o.priceA));
  const bestB = bestPrice(matchup.odds.map((o) => o.priceB));
  const fairA = noVigProbA(bestA, bestB);
  const edge = sim.probA - fairA; // model vs market

  return (
    <Link href={`/events/${"vanguard-fc-14"}#${matchup.id}`} className="block">
      <div id={matchup.id} className="panel panel-hover rounded-xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {matchup.isTitle && <Badge variant="amber">★ Title</Badge>}
            <Badge variant="steel">{matchup.weightClass}</Badge>
            <Badge variant="neutral">{matchup.rounds} rounds</Badge>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted">
            <span>Line</span>
            <Sparkline points={matchup.lineHistory.map((p) => p.impliedA)} tone="amber" width={64} height={20} />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Fighter A */}
          <div className="flex items-center gap-3">
            <FighterAvatar fighter={a} size="md" />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold uppercase leading-tight">{a.name}</p>
              <p className="tnum text-xs text-muted">{recordString(a.record)}</p>
              <p className="tnum mt-0.5 text-sm font-semibold text-blood">{fmtOdds(bestA)}</p>
            </div>
          </div>

          {/* Center */}
          <div className="flex flex-col items-center">
            <span className="font-display text-xs font-bold text-muted">VS</span>
            <div className="mt-1 rounded-md border border-line bg-bg px-2 py-1 text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted">AI Conf.</p>
              <p className="tnum text-sm font-bold text-fg">{pct(Math.max(sim.probA, sim.probB))}</p>
            </div>
          </div>

          {/* Fighter B */}
          <div className="flex items-center justify-end gap-3 text-right">
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold uppercase leading-tight">{b.name}</p>
              <p className="tnum text-xs text-muted">{recordString(b.record)}</p>
              <p className="tnum mt-0.5 text-sm font-semibold text-edge">{fmtOdds(bestB)}</p>
            </div>
            <FighterAvatar fighter={b} size="md" />
          </div>
        </div>

        {/* Value indicator */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p className="text-[11px] text-muted">
            Model: <span className="tnum text-blood">{pct(sim.probA)}</span> {lastName(a.name)} · Market (no-vig):{" "}
            <span className="tnum text-fg">{pct(fairA)}</span>
          </p>
          {Math.abs(edge) >= 0.04 ? (
            <Badge variant={edge > 0 ? "edge" : "neutral"}>
              {edge > 0 ? `Value signal: ${lastName(a.name)} +${pct(edge)}` : `Value signal: ${lastName(b.name)} +${pct(-edge)}`}
            </Badge>
          ) : (
            <Badge variant="neutral">No strong edge</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
