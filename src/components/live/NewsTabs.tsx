"use client";

import { useState } from "react";
import { FIGHTVEX_NEWS, type NewsTag } from "@/lib/data/fightvex-news";
import { SortToggle } from "./SortToggle";

const TAG_STYLE: Record<NewsTag, string> = {
  Milestone: "border-amber/50 text-amber",
  Feature: "border-edge/50 text-edge",
  Transparency: "border-blood/50 text-blood",
};
const fmtDate = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const FILTERS = ["All", "Milestone", "Feature", "Transparency"] as const;
type Filter = (typeof FILTERS)[number];

// Collapsible, filterable changelog: a scannable list of every update (tag +
// date + title) with the newest expanded — so reading old news is a click, not
// a scroll past everything.
function FightVexFeed() {
  const [filter, setFilter] = useState<Filter>("All");
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });
  const [newestFirst, setNewestFirst] = useState(true);

  const items = FIGHTVEX_NEWS
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => filter === "All" || n.tag === filter)
    .sort((a, b) => (new Date(a.n.date).getTime() - new Date(b.n.date).getTime()) * (newestFirst ? -1 : 1));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              aria-pressed={filter === t}
              className={`btn-toggle rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wide ${filter === t ? "is-on" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>
        <SortToggle newestFirst={newestFirst} onToggle={() => setNewestFirst((v) => !v)} />
      </div>

      <div className="space-y-2.5">
        {items.map(({ n, i }) => {
          const isOpen = !!open[i];
          return (
            <article key={i} className="overflow-hidden rounded-xl border border-line/70 bg-panel/40">
              <button
                onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] sm:px-5"
              >
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${TAG_STYLE[n.tag]}`}>{n.tag}</span>
                <span className="hidden shrink-0 text-[11px] uppercase tracking-wider text-muted sm:inline">{fmtDate(n.date)}</span>
                <h3 className={`min-w-0 flex-1 font-display text-sm font-bold uppercase leading-tight sm:text-base ${isOpen ? "" : "truncate"}`}>{n.title}</h3>
                <svg className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {isOpen && (
                <div className="border-t border-line/50 px-4 pb-5 pt-3 sm:px-5">
                  <p className="text-[11px] uppercase tracking-wider text-muted sm:hidden">{fmtDate(n.date)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted sm:mt-0">{n.body}</p>
                  {n.href && (
                    <a href={n.href} className="mt-3 inline-block text-xs font-semibold uppercase tracking-wider text-blood hover:underline">
                      See it →
                    </a>
                  )}
                </div>
              )}
            </article>
          );
        })}
        {items.length === 0 && (
          <p className="rounded-xl border border-line bg-panel/40 p-5 text-sm text-muted">No {filter.toLowerCase()} updates yet.</p>
        )}
      </div>

      <p className="rounded-lg border border-line bg-panel/60 p-4 text-[11px] leading-relaxed text-muted">
        FightVex updates are written by the team. Every claim here is verifiable on the site — picks are Bitcoin-timestamped before each event and graded against real results. Nothing is exaggerated. 21+.
      </p>
    </div>
  );
}

export function NewsTabs({ ufcNews }: { ufcNews: React.ReactNode }) {
  const [tab, setTab] = useState<"ufc" | "fightvex">("ufc");
  const Tab = ({ id, label }: { id: "ufc" | "fightvex"; label: string }) => (
    <button
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={`btn-toggle rounded-md px-4 py-2 text-sm font-bold uppercase tracking-wide ${tab === id ? "is-on" : ""}`}
    >
      {label}
    </button>
  );
  return (
    <div>
      <div className="reveal mb-6 flex flex-wrap gap-2">
        <Tab id="ufc" label="UFC News" />
        <Tab id="fightvex" label="FightVex News" />
      </div>
      {tab === "ufc" ? ufcNews : <FightVexFeed />}
    </div>
  );
}
