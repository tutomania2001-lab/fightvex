import { FlareSpeed } from "./FlareSpeed";

// Full-page red/blue corner flare — the FightVex HQ background. Fixed behind
// all content (UI panels sit on top). Red drifts around the upper-left, blue
// around the lower-right, each on its own slow loop so the glow is always
// gently moving (see .fv-flare* in globals.css). FlareSpeed surges the drift
// on each tab change, then eases it back. Motion is disabled under
// prefers-reduced-motion, leaving a static flare.
export function FlareBackdrop() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="fv-flare fv-flare-red" />
        <div className="fv-flare fv-flare-blue" />
      </div>
      <FlareSpeed />
    </>
  );
}
