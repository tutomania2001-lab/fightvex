import { NextResponse } from "next/server";
import { getRecord } from "@/lib/predictions";
import { getCommitments } from "@/lib/commit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The live, pre-registered accuracy record + the Bitcoin-anchored pick
// commitments. Lets the Simulator's Accuracy tab show the same data the
// /accuracy page does, inline — without leaving the simulator.
export async function GET() {
  const [record, commitments] = await Promise.all([getRecord(), getCommitments()]);
  return NextResponse.json({ ...record, commitments });
}
