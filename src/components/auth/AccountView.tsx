"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { PLAN_LABEL, PLAN_RANK, toolsForPlan, type Plan } from "@/lib/entitlements";
import { AccountHome, type HomePayload, type TrackRecord, type ChecklistItem, type Stats } from "@/components/auth/AccountHome";

// Local mirrors of the server shapes (avoid importing the server-only store).
type SavedInsight = {
  id: string;
  aName: string;
  bName: string;
  winnerName: string;
  method: string;
  confidence: number;
  rounds: number;
  runs: number;
  createdAt: string;
};
type WatchItem = { fighterId: string; name: string; addedAt: string };

type SectionId = "home" | "insights" | "watchlist" | "tools" | "subscription" | "profile";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "insights", label: "Saved Insights" },
  { id: "watchlist", label: "Watchlist" },
  { id: "tools", label: "Tools & Access" },
  { id: "subscription", label: "Subscription" },
  { id: "profile", label: "Profile" },
];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function AccountView() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading, logout, refresh } = useAuth();

  const initial = (params.get("section") as SectionId) || "home";
  const [section, setSection] = useState<SectionId>(
    SECTIONS.some((s) => s.id === initial) ? initial : "home"
  );

  const [insights, setInsights] = useState<SavedInsight[]>([]);
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [home, setHome] = useState<HomePayload | null>(null);
  const [record, setRecord] = useState<TrackRecord | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [counts, setCounts] = useState<{ insights: number; watchlist: number }>({ insights: 0, watchlist: 0 });
  const [homeLoading, setHomeLoading] = useState(true);

  // Bounce out if there's no session.
  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/account");
  }, [loading, user, router]);

  // Load account data once we have a user. Also pings the activity streak.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetch("/api/account/activity", { method: "POST" }).catch(() => {});
    Promise.all([
      fetch("/api/account/insights", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/account/watchlist", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/account/home", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
    ]).then(([i, w, h]) => {
      if (!alive) return;
      setInsights(i.insights ?? []);
      setWatchlist(w.watchlist ?? []);
      setHome(h.home ?? null);
      setRecord(h.record ?? null);
      setChecklist(h.checklist ?? []);
      setStats(h.stats ?? null);
      setCounts(h.counts ?? { insights: 0, watchlist: 0 });
      setHomeLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  // Returning from Stripe checkout: the webhook upgrades the plan a beat later,
  // so re-pull the session shortly after landing so the new plan shows.
  useEffect(() => {
    if (params.get("checkout") !== "success") return;
    const t = setTimeout(() => refresh(), 2500);
    return () => clearTimeout(t);
  }, [params, refresh]);

  const go = useCallback((id: SectionId) => {
    setSection(id);
    if (typeof window !== "undefined")
      window.history.replaceState(null, "", `/account?section=${id}`);
  }, []);

  const removeInsight = useCallback(async (id: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/account/insights?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  }, []);

  const removeWatch = useCallback(async (fighterId: string) => {
    setWatchlist((prev) => prev.filter((w) => w.fighterId !== fighterId));
    setCounts((c) => ({ ...c, watchlist: Math.max(0, c.watchlist - 1) }));
    await fetch(`/api/account/watchlist?fighterId=${encodeURIComponent(fighterId)}`, { method: "DELETE" });
  }, []);

  const addWatch = useCallback(async (f: { id: string; name: string }) => {
    setWatchlist((prev) =>
      prev.some((w) => w.fighterId === f.id) ? prev : [{ fighterId: f.id, name: f.name, addedAt: new Date().toISOString() }, ...prev]
    );
    setCounts((c) => ({ ...c, watchlist: c.watchlist + 1 }));
    await fetch("/api/account/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fighterId: f.id, name: f.name }),
    });
  }, []);

  const watchedIds = useMemo(() => new Set(watchlist.map((w) => w.fighterId)), [watchlist]);

  if (loading || !user) {
    return <div className="mx-auto mt-10 h-64 w-full max-w-6xl animate-pulse rounded-2xl panel" />;
  }

  return (
    <>
      <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-faint">Account</p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold uppercase sm:text-4xl">
              {user.name.split(" ")[0] || "Your"} <span className="text-gradient-steel">HQ</span>
            </h1>
            {user.plan !== "free" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.plan === "elite" ? "/plan-elite.png" : "/plan-pro.png"} alt={`${user.plan} plan`} title={PLAN_LABEL[user.plan]} className="h-9 w-9 shrink-0 object-contain" />
            )}
          </div>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
        </div>

        <div className="relative mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Section nav */}
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-20 lg:flex-col lg:self-start lg:overflow-visible lg:pb-0">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => go(s.id)}
                className={`shrink-0 rounded-lg border px-3.5 py-2.5 text-left text-sm font-semibold uppercase tracking-wide transition-all duration-200 ${
                  section === s.id
                    ? "border-white/12 bg-white/[0.07] text-fg"
                    : "border-transparent text-muted hover:bg-white/[0.03] hover:text-fg"
                }`}
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={async () => {
                await logout();
                router.push("/");
                router.refresh();
              }}
              className="mt-2 shrink-0 rounded-lg border border-transparent px-3.5 py-2.5 text-left text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:text-fg"
            >
              Log out
            </button>
          </nav>

          {/* Section body — replays the smooth surge on every tab change */}
          <div key={section} className="min-w-0 animate-surge">
            {section === "home" && (
            <AccountHome
              user={user}
              home={home}
              record={record}
              checklist={checklist}
              stats={stats}
              counts={counts}
              recent={insights}
              watchedIds={watchedIds}
              onWatch={addWatch}
              go={go}
              loading={homeLoading}
            />
          )}
          {section === "insights" && <InsightsSection insights={insights} onRemove={removeInsight} />}
          {section === "watchlist" && <WatchlistSection watchlist={watchlist} onRemove={removeWatch} />}
          {section === "tools" && <ToolsSection plan={user.plan} />}
          {section === "subscription" && <SubscriptionSection plan={user.plan} justUpgraded={params.get("checkout") === "success"} />}
          {section === "profile" && <ProfileSection name={user.name} email={user.email} onSaved={refresh} />}
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Minimal / monochrome buttons (no accent colour inside the UI).
const primaryBtn =
  "group inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] text-fg backdrop-blur transition-all duration-200 hover:border-white/30 hover:bg-white/[0.1] disabled:opacity-50";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] text-muted transition-colors hover:border-steel hover:text-fg";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`panel rounded-2xl p-6 ${className}`}>{children}</div>;
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-lg font-bold uppercase">{children}</h2>;
}

// ---------------------------------------------------------------------------
function InsightsSection({ insights, onRemove }: { insights: SavedInsight[]; onRemove: (id: string) => void }) {
  return (
    <div>
      <H2>Saved Insights</H2>
      <p className="mt-1 text-sm text-muted">Simulations you&apos;ve saved from the simulator.</p>
      {insights.length === 0 ? (
        <EmptyState
          text="No saved insights yet."
          ctaHref="/simulator"
          ctaLabel="Open the simulator"
        />
      ) : (
        <ul className="mt-5 space-y-3">
          {insights.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 panel panel-hover rounded-xl p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {i.aName} <span className="text-muted">vs</span> {i.bName}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {i.winnerName} by {i.method} · {Math.round(i.confidence * 100)}% · {i.rounds}R / {i.runs.toLocaleString()} runs
                </p>
                <p className="mt-0.5 text-[11px] text-muted">{fmtDate(i.createdAt)}</p>
              </div>
              <button onClick={() => onRemove(i.id)} className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted transition-colors hover:border-steel hover:text-fg">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function WatchlistSection({ watchlist, onRemove }: { watchlist: WatchItem[]; onRemove: (id: string) => void }) {
  return (
    <div>
      <H2>Watchlist</H2>
      <p className="mt-1 text-sm text-muted">Fighters you&apos;re tracking.</p>
      {watchlist.length === 0 ? (
        <EmptyState text="Your watchlist is empty." ctaHref="/fighters" ctaLabel="Browse fighters" />
      ) : (
        <ul className="mt-5 space-y-3">
          {watchlist.map((w) => (
            <li key={w.fighterId} className="flex items-center justify-between gap-3 panel panel-hover rounded-xl p-4">
              <Link href={`/fighters/${w.fighterId}`} className="min-w-0 font-semibold transition-colors hover:text-fg">
                {w.name || w.fighterId}
              </Link>
              <button onClick={() => onRemove(w.fighterId)} className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted transition-colors hover:border-steel hover:text-fg">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function ToolsSection({ plan }: { plan: Plan }) {
  const { unlocked, locked } = useMemo(() => toolsForPlan(plan), [plan]);
  return (
    <div className="space-y-8">
      {/* No outer panel — the tool cards hover directly on the page background. */}
      <div>
        <H2>Your tools</H2>
        <p className="mt-1 text-sm text-muted">{unlocked.length} tools unlocked on your {PLAN_LABEL[plan]} plan.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {unlocked.map((t) => (
            <Link key={t.id} href={t.href} className="group rounded-xl panel panel-hover p-4 hover:border-steel">
              <div className="flex items-center justify-between">
                <p className="font-semibold transition-colors group-hover:text-fg">{t.name}</p>
                <span className="text-sm text-steel">✓</span>
              </div>
              <p className="mt-1 text-sm text-muted">{t.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {locked.length > 0 && (
        <div>
          <H2>Locked tools</H2>
          <p className="mt-1 text-sm text-muted">Upgrade to unlock these.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {locked.map((t) => (
              <div key={t.id} className="relative rounded-xl panel p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-steel">🔒 {t.name}</p>
                  <span className="rounded border border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-steel">
                    {PLAN_LABEL[t.minPlan]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{t.description}</p>
              </div>
            ))}
          </div>
          <Link href="/pricing" className={`mt-5 ${primaryBtn}`}>
            Upgrade <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
const TIERS: { plan: Plan; price: string; cadence: string; blurb: string }[] = [
  { plan: "free", price: "£0", cadence: "forever", blurb: "Core profiles, fight cards and limited simulations." },
  { plan: "pro", price: "£20", cadence: "/mo", blurb: "Unlimited sims, full metrics, line movement and EV tools." },
  { plan: "elite", price: "£40", cadence: "/mo", blurb: "CLV tracker, overreaction detector, bet-slip review and bankroll suite." },
];

function SubscriptionSection({ plan, justUpgraded }: { plan: Plan; justUpgraded: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/stripe/portal", { method: "POST" });
      const j = (await r.json()) as { url?: string; error?: string };
      if (j.url) window.location.assign(j.url);
      else setError(j.error || "Couldn't open billing.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function checkout(target: Exclude<Plan, "free">) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: target }),
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (j.url) window.location.assign(j.url);
      else setError(j.error || "Couldn't start checkout.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {justUpgraded && (
        <div className="rounded-2xl border border-line bg-white/[0.04] p-4 text-sm">
          <span className="text-fg">✓</span> Payment received — your plan is now active. If it still shows below, give it a few seconds and refresh.
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <H2>Current plan</H2>
          {plan !== "free" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={plan === "elite" ? "/plan-elite.png" : "/plan-pro.png"} alt={`${plan} plan`} title={PLAN_LABEL[plan]} className="h-8 w-8 shrink-0 object-contain" />
          )}
        </div>
        <p className="mt-3 text-sm text-muted">
          {plan === "free"
            ? "You're on the free plan. Upgrade to unlock Pro and Elite tools."
            : `Thanks for subscribing to ${PLAN_LABEL[plan]}.`}
        </p>
        {plan !== "free" && (
          <button onClick={openPortal} disabled={busy} className={`mt-4 ${ghostBtn} disabled:opacity-60`}>
            {busy ? "Opening…" : "Manage billing"}
          </button>
        )}
        {error && <p className="mt-2 text-sm text-steel">{error}</p>}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {TIERS.map((t) => {
          const current = t.plan === plan;
          const owned = PLAN_RANK[plan] >= PLAN_RANK[t.plan];
          const titleTone = t.plan === "elite" ? "text-blood-dim" : t.plan === "pro" ? "text-blue" : "text-fg";
          const ring = t.plan === "elite" ? "border-blood/60 glow-blood" : t.plan === "pro" ? "border-blue/60 glow-blue" : "border-white/20";
          return (
            <div key={t.plan} className={`panel ${current ? ring : "panel-hover"} rounded-2xl p-5`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-display text-lg font-bold uppercase ${titleTone}`}>{PLAN_LABEL[t.plan]}</h3>
                {current && <span className="rounded-full border border-white/20 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fg">Current</span>}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold">{t.price}</span>
                <span className="text-xs text-muted">{t.cadence}</span>
              </div>
              <p className="mt-2 text-sm text-muted">{t.blurb}</p>
              {!owned && t.plan !== "free" && (
                <button onClick={() => checkout(t.plan as Exclude<Plan, "free">)} disabled={busy} className={`group mt-4 ${primaryBtn} px-4 py-2 text-xs disabled:opacity-60`}>
                  Upgrade <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function ProfileSection({ name, email, onSaved }: { name: string; email: string; onSaved: () => Promise<void> }) {
  return (
    <div className="space-y-6">
      <NameForm name={name} onSaved={onSaved} />
      <Card>
        <H2>Email</H2>
        <p className="mt-2 text-sm">{email}</p>
        <p className="mt-1 text-[11px] text-muted">Your email is your account ID and can&apos;t be changed here.</p>
      </Card>
      <PasswordForm />
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-line bg-bg/60 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-steel focus:bg-bg";

function NameForm({ name, onSaved }: { name: string; onSaved: () => Promise<void> }) {
  const [value, setValue] = useState(name);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) setMsg({ ok: false, text: j.error || "Couldn't save." });
      else {
        await onSaved();
        setMsg({ ok: true, text: "Saved." });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <H2>Name</H2>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input value={value} onChange={(e) => setValue(e.target.value)} className={inputCls} required />
        <button disabled={busy || value.trim() === name} className={`shrink-0 ${primaryBtn}`}>
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-fg" : "text-steel"}`}>{msg.text}</p>}
    </Card>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) setMsg({ ok: false, text: j.error || "Couldn't change password." });
      else {
        setMsg({ ok: true, text: "Password updated." });
        setCurrent("");
        setNext("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <H2>Change password</H2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input type="password" placeholder="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} required />
        <input type="password" placeholder="New password (min 8)" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} minLength={8} required />
        <button disabled={busy} className={primaryBtn}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-fg" : "text-steel"}`}>{msg.text}</p>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
function EmptyState({ text, ctaHref, ctaLabel }: { text: string; ctaHref: string; ctaLabel: string }) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-line bg-panel-2/20 p-8 text-center">
      <p className="text-sm text-muted">{text}</p>
      <Link href={ctaHref} className={`mt-3 ${primaryBtn} text-xs`}>
        {ctaLabel} <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
      </Link>
    </div>
  );
}

