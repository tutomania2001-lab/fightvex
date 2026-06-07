import Image from "next/image";
import { eventHero } from "@/lib/data/event-media";
import type { FightEvent } from "@/lib/types";

// Background-only event banner (no fighters). Uses a curated, event-relevant
// image when one is mapped (e.g. the White House card → a White House backdrop);
// otherwise a cinematic octagon scene + red/blue flare. The card content sits
// on top as an overlay.
export function EventBanner({ event }: { event: FightEvent }) {
  const hero = eventHero(event);
  const src = hero ?? "/bg-octagon.jpg";
  // Always grayscale so any backdrop sits cleanly in our palette; the big
  // red (left) / blue (right) flares ride on top and cover most of the B&W,
  // leaving a clear view of the subject through the centre. object-center
  // keeps the whole subject in frame (no roof-only / half crops).
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes="(min-width:1280px) 1200px, 100vw"
      className="object-cover object-[center_36%] grayscale"
    />
  );
}
