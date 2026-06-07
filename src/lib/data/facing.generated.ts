// Fighters whose photo faces the viewer's LEFT (most UFC shots face RIGHT).
// Used to mirror picks so both fighters always face INWARD. Default = R.
// Auto-detected from head-vs-shoulders lean, then hand-corrected for the few
// near-frontal shots the heuristic mislabels (add/remove a slug here as needed).
/* eslint-disable */
export const FACES_LEFT: Record<string, true> = {
  "aaron-pico": true,
  "ante-delija": true,
  "erin-blanchfield": true,
  "john-yannis": true,
  "karine-silva": true,
  "kevin-vallejos": true,
  "kyoji-horiguchi": true,
  "michael-aswell": true,
  "murtazali-magomedov": true,
  "natalia-silva": true,
  "rizvan-kuniev": true,
  "tim-elliott": true,
  "tyrell-fortune": true,
  "yaroslav-amosov": true,
};

export function facingFor(slug: string): "L" | "R" {
  return FACES_LEFT[slug] ? "L" : "R";
}
