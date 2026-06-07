// Watchlist email alerts (server-only): "your watched fighter is on this week's
// card." Pro+ perk. Runs from the predictions cron. Dormant until Resend
// (RESEND_API_KEY) and accounts (Upstash) are configured; sends are best-effort
// and de-duplicated per (user, event) so a fighter is only flagged once per card.
import { upcomingEvents } from "./data/events";
import { getFighterById } from "./data/fighters";
import { createSupabaseAdmin } from "./supabase/admin";
import { sendEmail, emailEnabled } from "./email";
import { redis, authEnabled } from "./auth";
import { hasAccess, type Plan } from "./entitlements";

const SITE = "https://fightvex.com";
const WINDOW_DAYS = 8; // "this week / next card" horizon

export async function sendWatchlistAlerts(
  nowMs: number
): Promise<{ sent: number; skipped: number }> {
  if (!emailEnabled || !authEnabled) return { sent: 0, skipped: 0 };

  // 1) fighters on upcoming cards within the window → fighterId -> event
  const soon = upcomingEvents().filter((e) => {
    const t = new Date(e.date).getTime();
    return t > nowMs && t - nowMs < WINDOW_DAYS * 864e5;
  });
  if (!soon.length) return { sent: 0, skipped: 0 };
  const onCard = new Map<string, { eventName: string; eventSlug: string; date: string }>();
  for (const e of soon)
    for (const m of e.matchups)
      for (const fid of [m.fighterA, m.fighterB])
        if (!onCard.has(fid)) onCard.set(fid, { eventName: e.name, eventSlug: e.slug, date: e.date });

  // 2) all watchlist rows + each owner's plan/email (service_role; join in code)
  const admin = createSupabaseAdmin();
  const { data: watch } = await admin.from("watchlist").select("user_id, fighter_id, name");
  if (!watch?.length) return { sent: 0, skipped: 0 };
  const userIds = [...new Set(watch.map((w) => w.user_id as string))];
  const { data: profs } = await admin.from("profiles").select("id, email, plan").in("id", userIds);
  const profById = new Map(
    (profs ?? []).map((p) => [p.id as string, p as { id: string; email: string; plan: Plan }])
  );

  // 3) per user, collect watched fighters that are on a soon card
  const byUser = new Map<string, { fighterId: string; name: string }[]>();
  for (const w of watch) {
    if (!onCard.has(w.fighter_id as string)) continue;
    const arr = byUser.get(w.user_id as string) ?? [];
    arr.push({ fighterId: w.fighter_id as string, name: w.name as string });
    byUser.set(w.user_id as string, arr);
  }

  let sent = 0, skipped = 0;
  for (const [uid, fighters] of byUser) {
    const prof = profById.get(uid);
    if (!prof?.email) { skipped++; continue; }
    if (!hasAccess(prof.plan ?? "free", "pro")) { skipped++; continue; } // alerts = Pro+ perk

    // group matched fighters by event; one email per (user, event), de-duped in KV
    const byEvent = new Map<string, { eventName: string; eventSlug: string; date: string; names: string[] }>();
    for (const f of fighters) {
      const c = onCard.get(f.fighterId)!;
      const g = byEvent.get(c.eventSlug) ?? { eventName: c.eventName, eventSlug: c.eventSlug, date: c.date, names: [] };
      g.names.push(getFighterById(f.fighterId)?.name ?? f.name);
      byEvent.set(c.eventSlug, g);
    }

    for (const [slug, g] of byEvent) {
      const dedupKey = `alert:wl:${uid}:${slug}`;
      const first = await redis<string | null>(["SET", dedupKey, "1", "NX", "EX", 21 * 86400]);
      if (first === null) { skipped++; continue; } // already alerted for this card

      const list = g.names.join(", ");
      const verb = g.names.length > 1 ? "are" : "is";
      const dateStr = new Date(g.date).toUTCString().slice(0, 16);
      const html =
        `<p>Heads up — <b>${list}</b> ${verb} on <b>${g.eventName}</b> (${dateStr}).</p>` +
        `<p>See the Vex AI read, method split and odds:<br><a href="${SITE}/events/${slug}">${SITE}/events/${slug}</a></p>` +
        `<p style="color:#888;font-size:12px">You're receiving this because you follow ${verb === "are" ? "these fighters" : "this fighter"} on FightVex. 21+ · Not betting advice.</p>`;
      const res = await sendEmail({
        to: prof.email,
        subject: `${list} ${verb} fighting — ${g.eventName}`,
        html,
      });
      if (res.ok) sent++;
      else { skipped++; await redis(["DEL", dedupKey]); } // failed (e.g. domain not verified) → retry next run
    }
  }
  return { sent, skipped };
}
