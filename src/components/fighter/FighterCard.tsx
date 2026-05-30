import Link from "next/link";
import type { Fighter } from "@/lib/types";
import { recordString, finishBreakdown, cmToIn } from "@/lib/format";
import { FighterAvatar } from "./FighterAvatar";
import { Badge } from "../ui/Badge";

export function FighterCard({ fighter }: { fighter: Fighter }) {
  return (
    <Link href={`/fighters/${fighter.slug}`} className="group block">
      <div className="panel panel-hover rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FighterAvatar fighter={fighter} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {fighter.champion && <Badge variant="amber">★ Champ</Badge>}
              <Badge variant="steel">{fighter.weightClass}</Badge>
            </div>
            <h3 className="mt-1.5 truncate font-display text-lg font-bold uppercase tracking-wide text-fg group-hover:text-white">
              {fighter.name}
            </h3>
            {fighter.nickname && <p className="truncate text-xs italic text-blood">“{fighter.nickname}”</p>}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <div>
            <p className="tnum text-lg font-bold text-fg">{recordString(fighter.record)}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted">{finishBreakdown(fighter.record)}</p>
          </div>
          <div className="text-right text-[11px] text-muted">
            <p>{fighter.flag} {fighter.country}</p>
            <p className="tnum">{cmToIn(fighter.reachCm)} reach · {fighter.stance}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
