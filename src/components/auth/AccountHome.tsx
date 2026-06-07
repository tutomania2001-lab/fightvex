"use client";

import Link from "next/link";
import { type Plan } from "@/lib/entitlements";
import { CountUp } from "@/components/ui/CountUp";

// ---- shapes (mirror the /api/account/home payload) ----
export type HomePayload = {
  event: { name: string; slug: string; date: string; city: string; country: string } | null;
  watchedOnCard: { fighterId: string; name: string; opponentName: string; boutId: string }[];
  recommendedSims: { boutId: string; aId: string; aName: string; bId: string; bName: string; weightClass: string; reason: string }[];
  recommendedFighters: { id: string; name: string; slug: string; reason: string }[];
};
export type TrackRecord = { total: number; resolved: number; correct: number; pending: number };
export type ChecklistItem = { id: string; label: string; done: boolean; href: string };
export type Stats = { streak: number; lastActive: string; sims: number };
type RecentInsight = { id: string; aName: string; bName: string; winnerName: string; method: string; confidence: number };

// ---- minimal / monochrome styles (no accent colour inside the UI) ----
const primaryBtn =
  "group inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] text-fg backdrop-blur transition-all duration-200 hover:border-white/30 hover:bg-white/[0.1]";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] text-muted transition-colors hover:border-steel hover:text-fg";
const cardCls = "panel panel-hover rounded-2xl p-6";

function badgesFor(s: { streak: number; sims: number; saved: number; watch: number }) {
  const out: string[] = [];
  if (s.sims >= 1) out.push("First Blood");
  if (s.sims >= 10) out.push("Analyst");
  if (s.sims >= 25) out.push("Fight Scientist");
  if (s.watch >= 3) out.push("Cornerman");
  if (s.streak >= 2) out.push(`${s.streak}-day streak`);
  return out;
}

function eventTiming(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  const date = new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  if (days < 0) return date;
  if (days === 0) return `${date} · Tonight`;
  if (days === 1) return `${date} · Tomorrow`;
  return `${date} · in ${days} days`;
}

export function AccountHome({
  user,
  home,
  record,
  checklist,
  stats,
  counts,
  recent,
  watchedIds,
  onWatch,
  go,
}: {
  user: { name: string; plan: Plan };
  home: HomePayload | null;
  record: TrackRecord | null;
  checklist: ChecklistItem[];
  stats: Stats | null;
  counts: { insights: number; watchlist: number };
  recent: RecentInsight[];
  watchedIds: Set<string>;
  onWatch: (f: { id: string; name: string }) => void;
  go: (id: "insights" | "watchlist" | "tools" | "subscription") => void;
  loading: boolean;
}) {
  const first = user.name.split(" ")[0] || "there";
  const badges = stats ? badgesFor({ streak: stats.streak, sims: stats.sims, saved: counts.insights, watch: counts.watchlist }) : [];
  const checklistDone = checklist.filter((c) => c.done).length;
  const showChecklist = checklist.length > 0 && checklistDone < checklist.length;
  const alerts = home?.watchedOnCard.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-3 h-px w-12 bg-gradient-to-r from-steel to-transparent" />
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
            Welcome back, <span className="text-gradient-steel">{first}</span>
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            {alerts > 0 ? `${alerts} of your fighters ${alerts === 1 ? "is" : "are"} on the next card.` : "Your fight-night intel, in one place."}
          </p>
        </div>
        {stats && stats.streak >= 2 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-xs font-medium tracking-wide text-steel">
            <span className="h-1.5 w-1.5 rounded-full bg-steel" />{stats.streak}-day streak
          </span>
        )}
      </div>

      {/* Quick action */}
      <div className={cardCls}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-faint">Vex AI</p>
            <h3 className="mt-1.5 font-display text-xl font-bold uppercase">Run a simulation</h3>
            <p className="mt-1 max-w-md text-sm text-muted">Predict any matchup and save the calls worth keeping.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/simulator"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg border border-white/15 bg-white/[0.05] px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-fg backdrop-blur transition-all duration-300 hover:border-white/25 hover:shadow-[-12px_0_34px_-14px_rgba(225,6,0,0.7),12px_0_34px_-14px_rgba(46,144,255,0.65)]"
            >
              {/* red-left / blue-right corner flare — subtle at rest, lifts on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-65 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(80% 140% at 0% 50%, rgba(225,6,0,0.30), transparent 58%)," +
                    "radial-gradient(80% 140% at 100% 50%, rgba(46,144,255,0.27), transparent 58%)",
                }}
              />
              <span className="relative">Simulate a fight</span>
              <span className="relative transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
            <Link href="/fighters" className={ghostBtn}>Fighters</Link>
            <Link href="/betting" className={ghostBtn}>Betting</Link>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Simulations" value={stats?.sims ?? 0} />
        <StatTile label="Saved" value={counts.insights} onClick={() => go("insights")} />
        <StatTile label="Watching" value={counts.watchlist} onClick={() => go("watchlist")} />
        <StatTile label="Streak" value={stats?.streak ?? 0} suffix="d" />
      </div>

      {/* Onboarding checklist */}
      {showChecklist && (
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold uppercase">Get set up</h3>
            <span className="tnum text-sm text-muted">{checklistDone}/{checklist.length}</span>
          </div>
          <div className="mt-3 h-px w-full overflow-hidden bg-line">
            <div className="bar-grow h-full bg-fg/70" style={{ width: `${(checklistDone / checklist.length) * 100}%` }} />
          </div>
          <ul className="mt-4 space-y-2">
            {checklist.map((c) => (
              <li key={c.id}>
                <Link href={c.href} className="group flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] p-3 transition-colors hover:border-steel">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] transition ${c.done ? "bg-fg/90 text-bg" : "border border-line text-muted group-hover:border-steel"}`}>
                    {c.done ? "✓" : ""}
                  </span>
                  <span className={`flex-1 text-sm ${c.done ? "text-muted line-through" : "text-fg"}`}>{c.label}</span>
                  {!c.done && <span className="text-faint opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100">→</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* This week */}
      {home?.event && (
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-faint">This week</p>
            <Link href={`/events/${home.event.slug}`} className="group inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-fg">Full card <span className="transition-transform group-hover:translate-x-0.5">→</span></Link>
          </div>
          <p className="mt-2 font-display text-2xl font-bold uppercase">{home.event.name}</p>
          <p className="text-sm text-muted">{eventTiming(home.event.date)} · {home.event.city}, {home.event.country}</p>

          {home.watchedOnCard.length > 0 ? (
            <div className="mt-4 space-y-2">
              {home.watchedOnCard.map((w) => (
                <div key={w.boutId + w.fighterId} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white/[0.03] p-3 text-sm">
                  <span className="min-w-0 truncate"><span className="font-semibold">{w.name}</span> <span className="text-muted">vs {w.opponentName}</span></span>
                  <Link href={`/simulator?a=${w.fighterId}`} className="group inline-flex shrink-0 items-center gap-1 font-medium text-fg">Simulate <span className="transition-transform group-hover:translate-x-0.5">→</span></Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">None of your watched fighters are on this card. <Link href="/fighters" className="text-fg underline-offset-2 hover:underline">Add some →</Link></p>
          )}
        </div>
      )}

      {/* Recommended simulations */}
      {home && home.recommendedSims.length > 0 && (
        <Section title="Fights to simulate" hint="Picked from your watchlist & the card">
          <div className="grid gap-3 sm:grid-cols-2">
            {home.recommendedSims.map((s) => (
              <Link key={s.boutId} href={`/simulator?a=${s.aId}&b=${s.bId}`} className="group panel panel-hover rounded-xl p-4 hover:border-steel">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold">{s.aName} <span className="text-muted">vs</span> {s.bName}</p>
                  <span className="shrink-0 text-faint opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100">→</span>
                </div>
                <p className="mt-1.5 flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
                  <span className="rounded border border-line px-1.5 py-0.5">{s.weightClass}</span>
                  <span className={s.reason === "On your watchlist" ? "text-fg" : ""}>{s.reason}</span>
                </p>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Fighters to watch */}
      {home && home.recommendedFighters.length > 0 && (
        <Section title="Fighters to watch">
          <div className="grid gap-3 sm:grid-cols-2">
            {home.recommendedFighters.map((f) => {
              const watched = watchedIds.has(f.id);
              return (
                <div key={f.id} className="flex items-center justify-between gap-3 panel panel-hover rounded-xl p-4">
                  <Link href={`/fighters/${f.slug}`} className="min-w-0 group">
                    <p className="truncate font-semibold transition-colors group-hover:text-fg">{f.name}</p>
                    <p className="text-xs uppercase tracking-wide text-muted">{f.reason}</p>
                  </Link>
                  <button
                    onClick={() => !watched && onWatch({ id: f.id, name: f.name })}
                    disabled={watched}
                    className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${watched ? "border-line text-muted" : "border-white/15 bg-white/[0.05] text-fg hover:border-white/30 hover:bg-white/10"}`}
                  >
                    {watched ? "Watching" : "+ Watch"}
                  </button>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Stats + track record */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={cardCls}>
          <h3 className="font-display text-lg font-bold uppercase">Your stats</h3>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <MiniStat label="Sims" value={stats?.sims ?? 0} />
            <MiniStat label="Saved" value={counts.insights} />
            <MiniStat label="Watching" value={counts.watchlist} />
          </div>
          {badges.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {badges.map((b) => (
                <span key={b} className="rounded-full border border-line px-2.5 py-1 text-xs font-medium tracking-wide text-steel">{b}</span>
              ))}
            </div>
          )}
        </div>

        <div className={cardCls}>
          <h3 className="font-display text-lg font-bold uppercase">Prediction record</h3>
          {record && record.resolved > 0 ? (
            <>
              <p className="mt-3 font-display text-4xl font-bold text-fg">
                <CountUp value={Math.round((record.correct / record.resolved) * 100)} suffix="%" />
              </p>
              <p className="mt-1 text-sm text-muted">{record.correct}/{record.resolved} correct{record.pending > 0 ? ` · ${record.pending} pending` : ""}</p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {counts.insights > 0
                ? "Your accuracy appears here once your saved fights take place — verified against real results, never guessed."
                : "Save simulations and your real-world accuracy is tracked here, verified against actual results."}
            </p>
          )}
        </div>
      </div>

      {/* Recent activity */}
      {recent.length > 0 && (
        <Section title="Recent activity" action={{ label: "View all", onClick: () => go("insights") }}>
          <ul className="space-y-2">
            {recent.slice(0, 3).map((i) => (
              <li key={i.id} className="panel rounded-xl p-3 text-sm">
                <span className="font-semibold">{i.aName} <span className="text-muted">vs</span> {i.bName}</span>
                <span className="text-muted"> — {i.winnerName} by {i.method} ({Math.round(i.confidence * 100)}%)</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Upgrade nudge */}
      {user.plan === "free" && (
        <div className={cardCls}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-faint">Free plan</p>
          <h3 className="mt-1.5 font-display text-xl font-bold uppercase">Unlock the full arsenal</h3>
          <p className="mt-2 max-w-lg text-sm text-muted">
            You&apos;re on the preview. Pro unlocks unlimited custom simulations, full fighter metrics, the line-movement tracker, EV tools and watchlist alerts.
          </p>
          <button onClick={() => go("subscription")} className={`mt-4 ${primaryBtn}`}>
            See plans <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ---- small components ----
function StatTile({ label, value, suffix, onClick }: { label: string; value: number; suffix?: string; onClick?: () => void }) {
  const inner = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold"><CountUp value={value} suffix={suffix} /></p>
    </>
  );
  const cls = "panel panel-hover rounded-xl p-4 text-left";
  return onClick ? (
    <button onClick={onClick} className={`${cls} cursor-pointer`}>{inner}</button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-white/[0.02] p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold"><CountUp value={value} /></p>
    </div>
  );
}

function Section({ title, hint, action, children }: { title: string; hint?: string; action?: { label: string; onClick: () => void }; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold uppercase">{title}</h3>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
        {action && (
          <button onClick={action.onClick} className="group inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-fg">
            {action.label} <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
