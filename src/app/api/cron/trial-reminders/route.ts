import { NextResponse } from "next/server";
import { cronAuth } from "@/lib/cron-auth";
import { trialsEndingSoon, stripeEnabled } from "@/lib/stripe";
import { sendEmail, emailEnabled } from "@/lib/email";
import { redis } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily: email anyone whose 7-day Pro trial ends within ~48h, so the first
// charge is never a surprise. Deduped per subscription (KV, 14-day window) so a
// member is reminded at most once. Dormant if Stripe/Resend aren't configured.
export async function GET(req: Request) {
  const denied = cronAuth(req);
  if (denied) return denied;
  if (!stripeEnabled || !emailEnabled) {
    return NextResponse.json({ ok: false, reason: !stripeEnabled ? "stripe not configured" : "email not configured" });
  }

  const subs = await trialsEndingSoon(48);
  let sent = 0;
  for (const s of subs) {
    if (!s.email) continue;
    // Once per subscription.
    const first = await redis<string | null>(["SET", `trialremind:${s.subscriptionId}`, "1", "NX", "EX", 14 * 86400]);
    if (first === null) continue;

    const ends = new Date(s.trialEnd * 1000).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#111">
        <h2 style="font-weight:800;text-transform:uppercase">Your FightVex Pro trial ends ${ends}</h2>
        <p>Heads up — your 7-day free trial of <b>Pro</b> wraps up on <b>${ends}</b>. After that you'll be billed <b>£10/month</b> and keep everything: unlimited 50,000-run simulations, every fight's full read, the betting tools and the bet log.</p>
        <p>Happy to stay? No action needed. Want to stop? You can cancel anytime, no questions asked:</p>
        <p><a href="https://fightvex.com/account?section=subscription" style="display:inline-block;background:#e11d2a;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:8px">Manage subscription</a></p>
        <p style="color:#666;font-size:12px">FightVex is informational analytics, not betting advice. 21+.</p>
      </div>`;
    const r = await sendEmail({ to: s.email, subject: `Your FightVex Pro trial ends ${ends}`, html });
    if (r.ok) sent++;
  }

  return NextResponse.json({ ok: true, candidates: subs.length, sent });
}
