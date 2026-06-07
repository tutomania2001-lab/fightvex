"use client";

import { useEffect, useState } from "react";

// Real UFC/MMA news. General feed (no athleteId) is aggregated from many trusted
// outlets via /api/news/ufc (Google News, MMA Fighting, Sherdog, MMA Mania, ESPN);
// a fighter feed (athleteId) uses ESPN. Every item links to its real publisher;
// nothing is fabricated. Auto-refreshes so the feed stays current.
interface NewsItem {
  headline: string;
  description?: string;
  published?: string;
  link?: string;
  image?: string;
  source?: string;
}

function fmtWhen(d?: string) {
  if (!d) return "";
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RelatedNews({ athleteId, limit = 6 }: { athleteId?: string; limit?: number }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    let alive = true;
    const url = athleteId ? `/api/espn/news/${athleteId}` : `/api/news/ufc`;
    const load = (initial: boolean) => {
      if (initial) setState("loading");
      fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d) => { if (alive) { setItems((d.news || []).slice(0, limit)); setState("ready"); } })
        .catch(() => { if (alive && initial) setState("error"); });
    };
    load(true);
    // Keep it fresh — re-pull every 5 minutes (general feed updates constantly).
    const iv = athleteId ? null : setInterval(() => load(false), 5 * 60 * 1000);
    return () => { alive = false; if (iv) clearInterval(iv); };
  }, [athleteId, limit]);

  if (state === "loading") {
    // Card-shaped placeholders with a shimmer sweep — mirrors the real item
    // layout (source/time row, headline, description) so the feed reads as
    // actively loading, not a frozen grey block.
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
          <div key={i} className="rounded-xl border border-line/60 bg-bg/60 p-4">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <span className="fv-skel h-2.5 w-20 rounded" />
              <span className="fv-skel h-2.5 w-10 rounded" />
            </div>
            <span className="fv-skel block h-3.5 w-[88%] rounded" />
            <span className="fv-skel mt-2 block h-2.5 w-[68%] rounded" />
            <span className="fv-skel mt-1.5 block h-2.5 w-1/2 rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (state === "error" || items.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-panel/60 p-4 text-sm text-muted">
        No verified related intelligence available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((n, i) => {
        const inner = (
          <div className="rounded-xl border border-line/60 bg-bg/60 p-4 transition-colors hover:border-steel">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-blood">{n.source || "ESPN"}</span>
              {n.published && <span className="shrink-0 text-[10px] text-muted">{fmtWhen(n.published)}</span>}
            </div>
            <h3 className="font-display text-sm font-bold leading-snug text-fg">{n.headline}</h3>
            {n.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{n.description}</p>}
          </div>
        );
        return n.link
          ? <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>
          : <div key={i}>{inner}</div>;
      })}
      <p className="text-[10px] uppercase tracking-wider text-faint">
        {athleteId
          ? "Source: ESPN · opens publisher"
          : "Aggregated from leading MMA outlets · newest first · opens publisher"}
      </p>
    </div>
  );
}
