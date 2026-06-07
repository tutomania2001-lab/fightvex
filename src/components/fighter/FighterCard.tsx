import Link from "next/link";
import Image from "next/image";
import type { Fighter } from "@/lib/types";
import { recordString, finishBreakdown, cmToIn } from "@/lib/format";
import { Badge } from "../ui/Badge";
import { Flag } from "../ui/Flag";

export function FighterCard({ fighter }: { fighter: Fighter }) {
  return (
    <Link href={`/fighters/${fighter.slug}`} className="group block h-full">
      <div className="panel panel-hover flex h-full flex-col rounded-xl p-4">
        <div className="flex min-h-[7rem] flex-1 gap-3">
          <div className="relative aspect-[7/6] w-[78px] shrink-0 self-end">
            <Image src={fighter.image ?? "/fighters/unknown-v5.png"} alt={fighter.image ? fighter.name : ""} fill sizes="96px" className="object-contain object-bottom" />
            <span className="absolute right-0 top-0 z-10">
              <Flag emoji={fighter.flag} country={fighter.country} className="h-3 w-[18px] rounded-[2px] border border-black/40 shadow-sm" />
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Champion title shows the exact ESPN title; it can be long, so it
                  wraps and is capped to the card width (never spills off the UI). */}
              {fighter.title ? (
                <span className="inline-block max-w-full break-words rounded-full border border-amber/30 bg-amber/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase leading-snug tracking-wider text-amber">
                  ★ {fighter.title}
                </span>
              ) : (
                <>
                  {fighter.ranking != null && <Badge variant="amber">#{fighter.ranking}</Badge>}
                  <Badge variant="steel">{fighter.weightClass}</Badge>
                </>
              )}
            </div>
            <h3 className="mt-1.5 break-words font-display text-lg font-bold uppercase leading-[1.05] tracking-wide text-fg group-hover:text-white">
              {fighter.name}
            </h3>
            {fighter.nickname && <p className="truncate text-xs italic text-blood">“{fighter.nickname}”</p>}
          </div>
        </div>
        <div className="mt-0 flex items-center justify-between border-t border-line pt-3">
          <div>
            <p className="tnum text-lg font-bold text-fg">{recordString(fighter.record)}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted">{finishBreakdown(fighter.record)}</p>
          </div>
          <div className="text-right text-[11px] text-muted">
            <p className="flex items-center justify-end gap-1.5"><Flag emoji={fighter.flag} country={fighter.country} className="h-3 w-[18px] rounded-[2px]" /> {fighter.country}</p>
            <p className="tnum">{cmToIn(fighter.reachCm)} reach · {fighter.stance}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
