// ============================================================
// FightVex — per-event hero banner images.
//
// Resolves an event -> a curated, event-relevant background image in
// /public/events. Resolution order: exact slug → slug keyword → venue/city.
// The venue/city rule means most cards get a fitting backdrop automatically
// (e.g. every UFC APEX / Las Vegas card → the Strip at night) with no
// per-event wiring. All images are public-domain or free-license (commercial
// use, no attribution). Events with no match fall back to the cinematic octagon.
// ============================================================
import type { FightEvent } from "../types";

// Exact slug -> image (use for one-off, event-specific art).
export const EVENT_HERO: Record<string, string> = {
  "ufc-fight-night-muhammad-vs-bonfim": "/events/ufc-fight-night-muhammad-vs-bonfim.jpg",
  "ufc-fight-night-kape-vs-horiguchi": "/events/ufc-fight-night-kape-vs-horiguchi.jpg",
  "ufc-329-mcgregor-vs-holloway-2": "/events/ufc-329-mcgregor-vs-holloway-2.jpg",
};

// Keyword rules on the slug (survive fighter/slug changes). The White House card
// ("UFC Freedom 250") gets a public-domain White House backdrop.
const KEYWORD_HERO: { test: RegExp; img: string }[] = [
  { test: /freedom|white.?house/i, img: "/events/white-house.jpg" },
];

// Venue/city rules — the generic "respective location" backdrop for a card when
// no specific art is set. UFC's Las Vegas APEX hosts most Fight Nights, so any
// Vegas/APEX card lands on the Strip-at-night image automatically.
const VENUE_HERO: { test: RegExp; img: string }[] = [
  { test: /apex|las vegas/i, img: "/events/las-vegas.jpg" },
];

export function eventHero(event: Pick<FightEvent, "slug" | "venue" | "city">): string | undefined {
  if (EVENT_HERO[event.slug]) return EVENT_HERO[event.slug];
  for (const k of KEYWORD_HERO) if (k.test.test(event.slug)) return k.img;
  const where = `${event.venue ?? ""} ${event.city ?? ""}`;
  for (const v of VENUE_HERO) if (v.test.test(where)) return v.img;
  return undefined;
}

// Per-event vertical focal point (CSS object-position) for the banner crop.
// Scenery backdrops look best centered low (~36%); fighter face-off images have
// the heads near the top, so they need a higher focal point or the wide/short
// banner crop slices the faces off. Default keeps the scenery framing.
const EVENT_FOCUS: Record<string, string> = {
  // Faces/eyes sit ~18% down the image; on the short compact event-row strip the
  // crop must focus high to center the banner on eye level. (Lower % = more
  // headroom/heads; higher % = lower toward chest.)
  "ufc-329-mcgregor-vs-holloway-2": "center 13%",
};

export function eventFocus(event: Pick<FightEvent, "slug">): string {
  return EVENT_FOCUS[event.slug] ?? "center 36%";
}
