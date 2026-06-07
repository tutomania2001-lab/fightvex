import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { getProfileBilling, updateProfileBilling } from "@/lib/supabase/profile";
import { createPortalSession, stripeEnabled } from "@/lib/stripe";
import { badOrigin } from "@/lib/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Opens the Stripe Billing Portal so a subscriber can manage / cancel.
export async function POST(req: Request) {
  const csrf = badOrigin(req);
  if (csrf) return csrf;
  if (!stripeEnabled)
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });

  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const { stripeCustomerId } = await getProfileBilling(me.id);
  if (!stripeCustomerId)
    return NextResponse.json({ error: "No billing account yet." }, { status: 400 });

  try {
    const { url } = await createPortalSession(stripeCustomerId, new URL(req.url).origin);
    return NextResponse.json({ url });
  } catch (e) {
    // Stale customer (e.g. a test-mode customer after switching to live keys):
    // clear the dead id so the account is clean and send them to subscribe.
    if (/No such customer/i.test(String(e))) {
      await updateProfileBilling(me.id, { stripeCustomerId: null, plan: "free" });
      return NextResponse.json({ error: "No active subscription found — please subscribe first.", resubscribe: true }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not open the billing portal. Please try again." }, { status: 502 });
  }
}
