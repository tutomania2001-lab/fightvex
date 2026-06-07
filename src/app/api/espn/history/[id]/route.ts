import { NextResponse } from "next/server";
import { getCareerHistory } from "@/lib/espn-live";

export const revalidate = 21600; // 6h

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ fights: [] }, { status: 400 });
  try {
    const fights = await getCareerHistory(id);
    return NextResponse.json({ fights });
  } catch {
    // Never fabricate — surface an empty result the client renders as an error/empty state.
    return NextResponse.json({ fights: [], error: true }, { status: 502 });
  }
}
