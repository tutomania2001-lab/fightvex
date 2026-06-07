import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { getUserById, updateUser } from "@/lib/auth";
import { createCheckoutSession, stripeEnabled } from "@/lib/stripe";
import { badOrigin } from "@/lib/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Start a subscription checkout for the signed-in user. You MUST have an
// account to buy — the purchase upgrades this account, it never creates one.
export async function POST(req: Request) {
  const csrf = badOrigin(req);
  if (csrf) return csrf;
  if (!stripeEnabled)
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });

  const me = await currentUser();
  if (!me)
    return NextResponse.json({ error: "Please log in to upgrade.", needAuth: true }, { status: 401 });

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const plan = body.plan;
  if (plan !== "pro" && plan !== "elite")
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });

  // Reuse the Stripe customer if this account already has one.
  const full = await getUserById(me.id);
  const origin = new URL(req.url).origin;

  const args = { plan: plan as "pro" | "elite", userId: me.id, email: me.email, origin };
  try {
    const { url } = await createCheckoutSession({ ...args, customerId: full?.stripeCustomerId });
    return NextResponse.json({ url });
  } catch (e) {
    // Self-heal a stale customer id (e.g. a test-mode customer after switching to
    // live keys): drop the dead id and retry letting Stripe make a fresh customer.
    if (full?.stripeCustomerId && /No such customer/i.test(String(e))) {
      try {
        await updateUser(me.id, { stripeCustomerId: undefined });
        const { url } = await createCheckoutSession(args); // no customerId → new live customer
        return NextResponse.json({ url });
      } catch { /* fall through to generic error */ }
    }
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
