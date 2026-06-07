"use client";

import { useEffect, useMemo, useState } from "react";

// Real UFC/MMA news. General feed (no athleteId) is aggregated from many trusted
// outlets via /api/news/ufc (Google News, MMA Fighting, Sherdog, MMA Mania, ESPN);
// a fighter feed (athleteId) uses ESPN. Every item links to its real publisher;
// nothing is fabricated. Auto-refreshes so the feed stays current.
//
// `feed` mode (the /research tab) renders a scannable, source-filterable list
// that starts short with a "Show more" — so reaching older headlines is quick,
// not an endless scroll. Default mode keeps the richer cards (home / fighter pages).
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

const INITIAL = 8; // feed mode: headlines shown before "Show more"

export function RelatedNews({ athleteId, limit = 6, feed = false }: { athleteId?: string; limit?: number; feed?: boolean }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [src, setSrc] = useState<string>("All");
  const [showAll, setShowAll] = useState(false);

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
    const iv = athleteId ? null : setInterval(() => load(false), 5 * 60 * 1000);
    return () => { alive = false; if (iv) clearInterval(iv); };
  }, [athleteId, limit]);

  // Distinct sources for the filter chips (feed mode), most-common first.
  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of items) { const s = n.source || "ESPN"; counts.set(s, (counts.get(s) ?? 0) + 1); }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [items]);

  if (state === "loading") {
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

  // ---- Feed mode: filterable, scannable headline rows ----
  if (feed) {
    const filtered = src === "All" ? items : items.filter((n) => (n.source || "ESPN") === src);
    const shown = showAll ? filtered : filtered.slice(0, INITIAL);
    return (
      <div className="space-y-3">
        {sources.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {["All", ...sources].map((s) => (
              <button
                key={s}
                onClick={() => { setSrc(s); setShowAll(false); }}
                aria-pressed={src === s}
                className={`btn-toggle rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wide ${src === s ? "is-on" : ""}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="space-y-2">
          {shown.map((n, i) => {
            const row = (
              <div className="rounded-lg border border-line/60 bg-bg/60 px-4 py-3 transition-colors hover:border-steel">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                  <span className="font-semibold text-blood">{n.source || "ESPN"}</span>
                  {n.published && <span className="text-muted">· {fmtWhen(n.published)}</span>}
                </div>
                <h3 className="mt-0.5 font-display text-sm font-bold leading-snug text-fg">{n.headline}</h3>
              </div>
            );
            return n.link
              ? <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="block">{row}</a>
              : <div key={i}>{row}</div>;
          })}
        </div>
        {!showAll && filtered.length > INITIAL && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full rounded-lg border border-line bg-panel/40 py-2.5 text-xs font-bold uppercase tracking-wider text-muted transition-colors hover:border-steel hover:text-fg"
          >
            Show {filtered.length - INITIAL} more
          </button>
        )}
        <p className="text-[10px] uppercase tracking-wider text-faint">
          Aggregated from leading MMA outlets · newest first · opens publisher
        </p>
      </div>
    );
  }

  // ---- Default mode: richer cards (home / fighter pages) ----
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
