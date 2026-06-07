import { NextResponse } from "next/server";
import { getUfcNews } from "@/lib/espn-live";

export const revalidate = 21600; // 6h

export async function GET() {
  try {
    const news = await getUfcNews(10);
    return NextResponse.json({ news });
  } catch {
    return NextResponse.json({ news: [], error: true }, { status: 502 });
  }
}
