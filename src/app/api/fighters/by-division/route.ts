import { NextResponse } from "next/server";
import { fightersByClass, isP4P, poundForPound } from "@/lib/data/fighters";

export const revalidate = 3600;

// Returns the real roster for one division. Weight classes come from the
// ESPN-derived roster (champion first, then #2..#16, unranked last). The two
// pound-for-pound ladders are virtual: a flat #1..#15 pulled across divisions.
export async function GET(req: Request) {
  const wc = new URL(req.url).searchParams.get("wc") ?? "";
  if (isP4P(wc)) {
    return NextResponse.json({ fighters: poundForPound(wc) });
  }
  const byClass = fightersByClass();
  const fighters = (byClass[wc] ?? []).slice().sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999));
  return NextResponse.json({ fighters });
}
