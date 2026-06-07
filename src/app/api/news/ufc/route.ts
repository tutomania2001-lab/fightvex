import { NextResponse } from "next/server";
import { getAggregatedNews } from "@/lib/news-feed";

export const revalidate = 600; // 10 min — keep the feed fresh / "constantly updating"

export async function GET() {
  try {
    const news = await getAggregatedNews(24);
    return NextResponse.json({ news });
  } catch {
    return NextResponse.json({ news: [], error: true }, { status: 502 });
  }
}
