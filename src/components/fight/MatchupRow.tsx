import Link from "next/link";
import Image from "next/image";
import type { Matchup } from "@/lib/types";
import { getFighterById } from "@/lib/data/fighters";
import { getMatchup } from "@/lib/data/events";
import { simulate } from "@/lib/sim";
import { Badge } from "../ui/Badge";
import { Flag } from "../ui/Flag";
import { recordString, bestPrice, fmtOdds, lastName, signClass, confidenceLabel } from "@/lib/format";

export function MatchupRow({ matchup }: { matchup: Matchup }) {
  const a = getFighterById(matchup.fighterA)!;
  const b = getFighterById(matchup.fighterB)!;
  const sim = simulate(a, b, { rounds: matchup.rounds, runs: 600, shortNoticeA: matchup.shortNoticeA, shortNoticeB: matchup.shortNoticeB, missedWeightA: matchup.missedWeightA, missedWeightB: matchup.missedWeightB });

  const bestA = bestPrice(matchup.odds.map((o) => o.priceA));
  const bestB = bestPrice(matchup.odds.map((o) => o.priceB));
  // Public-safe: favoured side + qualitative confidence (exact % + value lean are Pro).
  const favored = sim.probA >= sim.probB ? a : b;
  const confidence = confidenceLabel(Math.max(sim.probA, sim.probB));
  const eventSlug = getMatchup(matchup.id)?.event.slug ?? "";

  return (
    <Link href={`/events/${eventSlug}#${matchup.id}`} className="block">
      <div id={matchup.id} className="panel panel-hover rounded-xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {matchup.isTitle && <Badge variant="amber">★ Title</Badge>}
            <Badge variant="steel">{matchup.weightClass}</Badge>
            <Badge variant="neutral">{matchup.rounds} rounds</Badge>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          {/* Fighter A */}
          <div className="flex min-w-0 items-end gap-2 sm:gap-3">
            <div className="relative h-[68px] w-12 shrink-0">
              <Image src={a.image ?? "/fighters/unknown-v5.png"} alt={a.image ? a.name : ""} fill sizes="56px" className="object-contain object-bottom" />
              <span className="absolute right-0 top-0 z-10">
                <Flag emoji={a.flag} country={a.country} className="h-2.5 w-4 rounded-[1px] border border-black/40" />
              </span>
            </div>
            <div className="min-w-0 pb-1">
              <p className="truncate font-display text-base font-bold uppercase leading-tight">{a.name}</p>
              <p className="tnum text-xs text-muted">{recordString(a.record)}</p>
              <p className={`tnum mt-0.5 text-sm font-semibold ${signClass(bestA)}`}>{fmtOdds(bestA)}</p>
            </div>
          </div>

          {/* Center */}
          <div className="flex flex-col items-center pb-1">
            <span className="font-display text-xs font-bold text-muted">VS</span>
            <div className="mt-1 rounded-md border border-line bg-bg px-2 py-1 text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted">Vex AI</p>
              <p className="text-xs font-bold text-edge">{confidence}</p>
            </div>
          </div>

          {/* Fighter B */}
          <div className="flex min-w-0 items-end justify-end gap-2 text-right sm:gap-3">
            <div className="min-w-0 pb-1">
              <p className="truncate font-display text-base font-bold uppercase leading-tight">{b.name}</p>
              <p className="tnum text-xs text-muted">{recordString(b.record)}</p>
              <p className={`tnum mt-0.5 text-sm font-semibold ${signClass(bestB)}`}>{fmtOdds(bestB)}</p>
            </div>
            <div className="relative h-[68px] w-12 shrink-0">
              <Image src={b.image ?? "/fighters/unknown-v5.png"} alt={b.image ? b.name : ""} fill sizes="56px" className={b.image ? "object-contain object-bottom" : "-scale-x-100 object-contain object-bottom"} />
              <span className="absolute left-0 top-0 z-10">
                <Flag emoji={b.flag} country={b.country} className="h-2.5 w-4 rounded-[1px] border border-black/40" />
              </span>
            </div>
          </div>
        </div>

        {/* Public pick (favoured side + confidence). Exact win %, value lean → Pro on /predict. */}
        <div className="mt-0 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p className="text-[11px] text-muted">
            Vex AI pick: <span className="font-semibold text-fg">{lastName(favored.name)}</span> · <span className="text-edge">{confidence}</span>
          </p>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-blood">Full read →</span>
        </div>
      </div>
    </Link>
  );
}
