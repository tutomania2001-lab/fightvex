import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { getProfileBilling, setProfilePlan } from "@/lib/supabase/profile";
import { syncPlanFromStripe, stripeEnabled } from "@/lib/stripe";
import { badOrigin } from "@/lib/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reconcile this account's plan straight from Stripe — webhook-independent.
// Verifies the signed-in user actually has an active/trialing subscription, then
// upgrades them. Safe to call anytime (idempotent); fixes a missed/late webhook.
export async function POST(req: Request) {
  const csrf = badOrigin(req);
  if (csrf) return csrf;
  if (!stripeEnabled) return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });

  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Please log in.", needAuth: true }, { status: 401 });

  const { stripeCustomerId } = await getProfileBilling(me.id);
  let found;
  try {
    found = await syncPlanFromStripe({ email: me.email, customerId: stripeCustomerId });
  } catch {
    return NextResponse.json({ error: "Couldn't reach Stripe. Try again in a moment." }, { status: 502 });
  }

  if (!found) return NextResponse.json({ plan: "free", synced: false });

  try {
    await setProfilePlan(me.id, me.email, {
      plan: found.plan,
      stripeCustomerId: found.customerId,
      stripeSubscriptionId: found.subscriptionId,
    });
  } catch (e) {
    // Surface the real DB error so we can diagnose (owner-facing).
    return NextResponse.json({ error: `Update failed: ${String((e as Error)?.message || e)}`, plan: found.plan }, { status: 500 });
  }
  return NextResponse.json({ plan: found.plan, synced: true });
}
