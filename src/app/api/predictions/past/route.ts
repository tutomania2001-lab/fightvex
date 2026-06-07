import { NextResponse } from "next/server";
import { getPastPicks } from "@/lib/predictions";
import { getCommitments } from "@/lib/commit";

export const dynamic = "force-dynamic";

// Settled + upcoming Vex AI picks grouped by card, plus the Bitcoin-anchored
// pick commitments so each card can show a "verify locked-in time" button.
export async function GET() {
  const [data, commitments] = await Promise.all([getPastPicks(), getCommitments()]);
  return NextResponse.json({ ...data, commitments });
}
