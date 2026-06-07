"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FIGHTVEX_NEWS, type NewsTag } from "@/lib/data/fightvex-news";

const TAG_STYLE: Record<NewsTag, string> = {
  Milestone: "border-amber/50 text-amber",
  Feature: "border-edge/50 text-edge",
  Transparency: "border-blood/50 text-blood",
};
const fmtDate = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function FightVexFeed() {
  return (
    <motion.div className="space-y-4" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }}>
      {FIGHTVEX_NEWS.map((n, i) => (
        <motion.article
          key={i}
          variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
          className="rounded-xl border border-line/70 bg-panel/40 p-5"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${TAG_STYLE[n.tag]}`}>{n.tag}</span>
            <span className="text-[11px] uppercase tracking-wider text-muted">{fmtDate(n.date)}</span>
          </div>
          <h3 className="mt-2.5 font-display text-lg font-bold uppercase leading-tight sm:text-xl">{n.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{n.body}</p>
          {n.href && (
            <a href={n.href} className="mt-3 inline-block text-xs font-semibold uppercase tracking-wider text-blood hover:underline">
              See it →
            </a>
          )}
        </motion.article>
      ))}
      <p className="rounded-lg border border-line bg-panel/60 p-4 text-[11px] leading-relaxed text-muted">
        FightVex updates are written by the team. Every claim here is verifiable on the site — picks are Bitcoin-timestamped before each event and graded against real results. Nothing is exaggerated. 21+.
      </p>
    </motion.div>
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
