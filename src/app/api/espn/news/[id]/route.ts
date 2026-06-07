import { NextResponse } from "next/server";
import { getAthleteNews } from "@/lib/espn-live";
import { getFighterById } from "@/lib/data/fighters";

export const revalidate = 21600; // 6h

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fighter = getFighterById(id);
  if (!fighter) return NextResponse.json({ news: [] }, { status: 404 });
  try {
    const news = await getAthleteNews(fighter.name);
    return NextResponse.json({ news });
  } catch {
    return NextResponse.json({ news: [], error: true }, { status: 502 });
  }
}
