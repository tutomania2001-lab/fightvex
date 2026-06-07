import Link from "next/link";
import Image from "next/image";
import type { Fighter } from "@/lib/types";
import { Flag } from "../ui/Flag";
import { recordString, finishBreakdown } from "@/lib/format";

// Featured, full-width display for a division champion (shown above the ranked
// contenders). Gold accents + larger portrait. All fields are real ESPN data.
export function ChampionCard({ fighter }: { fighter: Fighter }) {
  // The UFC championship belt is the banner backdrop for every champion.
  const bg = "/champion-belt.jpg";
  return (
    <Link href={`/fighters/${fighter.slug}`} className="group mb-4 block">
      <div className="relative overflow-hidden rounded-2xl border border-amber/40 bg-panel">
        {/* Championship-belt banner — centred so the gold plates read across the
            card; the gradient below darkens the left for the name/headshot. */}
        <Image src={bg} alt="" fill sizes="(min-width: 1280px) 1100px, 100vw" className="object-cover object-center" />
        {/* Always-dark gradient (fixed black, not the theme bg token) so the white
            text stays legible on the dark belt in BOTH light and dark mode. */}
        <div className="absolute inset-0 bg-gradient-to-r from-black from-[18%] via-black/45 via-[42%] to-transparent" />
        <div className="relative flex items-stretch gap-4 p-5 sm:gap-6 sm:p-6" style={{ textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}>
          <div className="relative aspect-[7/6] w-24 shrink-0 self-end -mb-5 sm:-mb-6 sm:w-36">
            <Image src={fighter.image ?? "/fighters/unknown-v5.png"} alt={fighter.name} fill sizes="160px" className="object-contain object-bottom" />
            <span className="absolute left-0 top-0 z-10">
              <Flag emoji={fighter.flag} country={fighter.country} className="h-3.5 w-[21px] rounded-[2px] border border-black/40 shadow-sm" />
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <span className="inline-flex w-max max-w-full items-center gap-1 truncate rounded-full border border-amber/50 bg-black/55 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber backdrop-blur-sm">
              ★ {fighter.title ?? "Champion"}
            </span>
            <h3 className="mt-2 font-display text-2xl font-black uppercase leading-none text-white sm:text-3xl">{fighter.name}</h3>
            {fighter.nickname && <p className="mt-1 truncate text-sm italic text-amber/80">“{fighter.nickname}”</p>}
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/70">
              <Flag emoji={fighter.flag} country={fighter.country} className="h-3 w-[18px] rounded-[2px]" /> {fighter.country || "N/A"}
            </p>
          </div>

          <div className="hidden shrink-0 flex-col justify-center border-l border-amber/20 pl-4 text-right sm:flex sm:pl-6">
            <p className="tnum font-display text-3xl font-bold text-white">{recordString(fighter.record)}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-white/65">{finishBreakdown(fighter.record)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
