// ============================================================
// FightVex — aggregated UFC/MMA news (server-only).
//
// Pulls real headlines from multiple trusted outlets (Google News —
// which itself aggregates every publisher — plus direct MMA feeds and
// ESPN), normalizes, dedupes and sorts newest-first. No fabrication:
// every item links to its real publisher. Refreshed frequently via the
// /api/news/ufc route's short revalidate.
// ============================================================
import { getUfcNews } from "./espn-live";

export interface FeedItem {
  headline: string;
  link: string;
  source: string;
  published?: string;
  description?: string;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const SOURCES: { name: string; url: string; cap: number }[] = [
  { name: "Google News", url: "https://news.google.com/rss/search?q=UFC+when:7d&hl=en-US&gl=US&ceid=US:en", cap: 25 },
  { name: "MMA Fighting", url: "https://www.mmafighting.com/rss/index.xml", cap: 12 },
  { name: "Sherdog", url: "https://www.sherdog.com/rss/news.xml", cap: 12 },
  { name: "MMA Mania", url: "https://www.mmamania.com/rss/index.xml", cap: 10 },
  { name: "Bloody Elbow", url: "https://www.bloodyelbow.com/feed", cap: 10 },
  { name: "BJPenn.com", url: "https://www.bjpenn.com/feed/", cap: 10 },
  { name: "LowKick MMA", url: "https://www.lowkickmma.com/feed/", cap: 8 },
  { name: "Cageside Press", url: "https://www.cagesidepress.com/feed/", cap: 6 },
  { name: "The Mac Life", url: "https://themaclife.com/feed/", cap: 6 },
];

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&(?:apos|#39);/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : undefined;
}

function parseFeed(xml: string, fallbackSource: string): FeedItem[] {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) || [];
  const out: FeedItem[] = [];
  for (const b of blocks) {
    let headline = tag(b, "title") || "";
    let link = tag(b, "link");
    if (!link) {
      const m = b.match(/<link[^>]*href="([^"]+)"/i);
      if (m) link = m[1];
    }
    const published = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated");
    const source = tag(b, "source") || fallbackSource;
    // Google News titles end with " - Publisher"; trim that redundancy.
    if (source && headline.endsWith(` - ${source}`)) headline = headline.slice(0, -(source.length + 3)).trim();
    let description = tag(b, "description") || tag(b, "summary");
    // Google News descriptions are an HTML list of related links — drop them.
    if (description && (description.length > 240 || /https?:\/\//.test(description))) description = undefined;
    if (headline && link) out.push({ headline, link, source, published, description });
  }
  return out;
}

async function fetchSource(name: string, url: string, cap: number): Promise<FeedItem[]> {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml" }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const xml = await r.text();
    return parseFeed(xml, name).slice(0, cap);
  } catch {
    return [];
  }
}

const ts = (d?: string) => { const t = d ? new Date(d).getTime() : 0; return Number.isNaN(t) ? 0 : t; };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function getAggregatedNews(limit = 20): Promise<FeedItem[]> {
  const lists = await Promise.all([
    ...SOURCES.map((s) => fetchSource(s.name, s.url, s.cap)),
    getUfcNews(12).then((n) =>
      n.map((x) => ({ headline: x.headline, link: x.link || "", source: "ESPN", published: x.published, description: x.description } as FeedItem))
        .filter((x) => x.link)
    ),
  ]);
  const all = lists.flat().sort((a, b) => ts(b.published) - ts(a.published));
  // dedupe by normalized headline, keeping the newest (already sorted)
  const seen = new Set<string>();
  const deduped: FeedItem[] = [];
  for (const it of all) {
    const k = norm(it.headline).slice(0, 70);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    deduped.push(it);
  }
  return deduped.slice(0, limit);
}
