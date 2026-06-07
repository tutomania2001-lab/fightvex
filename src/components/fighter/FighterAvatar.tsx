import Image from "next/image";
import { classnames } from "@/lib/format";
import type { Fighter } from "@/lib/types";
import { Flag } from "@/components/ui/Flag";

// Default "unknown fighter" silhouette until a real photo is set, with a small
// country flag badge.
export function FighterAvatar({
  fighter,
  size = "md",
  className,
  flip = false,
}: {
  fighter: Fighter;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Mirror horizontally — use for the right-hand fighter in a VS layout so they face inward. */
  flip?: boolean;
}) {
  const dim = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-20 w-20",
    xl: "h-28 w-28",
  }[size];

  return (
    <div className={classnames("relative", dim, className)} aria-label={fighter.name}>
      <Image
        src={fighter.image ?? "/fighters/unknown-v5.png"}
        alt={fighter.image ? fighter.name : ""}
        fill
        sizes="112px"
        className={classnames("object-contain object-bottom", flip && !fighter.image && "-scale-x-100")}
      />
      <span className={classnames("absolute top-0.5 z-10", flip ? "left-0.5" : "right-0.5")}>
        <Flag emoji={fighter.flag} country={fighter.country} className="h-3 w-[18px] rounded-[2px] border border-black/40 shadow-sm" />
      </span>
    </div>
  );
}
