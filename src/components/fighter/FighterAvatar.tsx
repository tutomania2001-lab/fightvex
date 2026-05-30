import { initials, hueFromString, classnames } from "@/lib/format";
import type { Fighter } from "@/lib/types";

// Stylized fighter avatar — no real photos required.
export function FighterAvatar({
  fighter,
  size = "md",
  className,
}: {
  fighter: Fighter;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const hue = hueFromString(fighter.slug);
  const dim = {
    sm: "h-10 w-10 text-sm",
    md: "h-14 w-14 text-base",
    lg: "h-20 w-20 text-xl",
    xl: "h-28 w-28 text-3xl",
  }[size];

  return (
    <div
      className={classnames(
        "relative flex items-center justify-center overflow-hidden rounded-lg border border-line font-display font-bold text-white clip-slash",
        dim,
        className
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 8% 14%) 0%, #0a0b0d 55%, rgba(225,6,0,0.55) 140%)`,
      }}
      aria-label={fighter.name}
    >
      <span className="absolute right-1 top-1 text-[10px] leading-none">{fighter.flag}</span>
      <span className="drop-shadow">{initials(fighter.name)}</span>
    </div>
  );
}
