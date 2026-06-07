import { NextResponse } from "next/server";
import { redis } from "@/lib/auth";
import type { Plan } from "@/lib/entitlements";
import { verifyWebhook, planForId } from "@/lib/stripe";
import { reportError } from "@/lib/observability";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe sends events here. We verify the signature, then reconcile the
// account's plan in Supabase (profiles). The userId rides along on every object
// (client_reference_id / metadata); for later events we resolve the user by the
// stripe_customer_id stored on the profile.
type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

// Trusted server context → service_role client (bypasses RLS).
function admin() {
  return createSupabaseAdmin();
}

async function setPlan(
  userId: string,
  plan: Plan,
  extra?: { stripeCustomerId?: string; stripeSubscriptionId?: string }
) {
  const patch: Record<string, unknown> = { plan };
  if (extra?.stripeCustomerId) patch.stripe_customer_id = extra.stripeCustomerId;
  if (extra?.stripeSubscriptionId) patch.stripe_subscription_id = extra.stripeSubscriptionId;
  const { error } = await admin().from("profiles").update(patch).eq("id", userId);
  if (error) throw new Error(`profiles update: ${error.message}`);
}

async function userIdForCustomer(customer?: string, metaUserId?: string): Promise<string | undefined> {
  if (metaUserId) return metaUserId;
  if (!customer) return undefined;
  const { data } = await admin()
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customer)
    .maybeSingle();
  return (data?.id as string | undefined) || undefined;
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("stripe-signature")))
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Bad payload." }, { status: 400 });
  }

  // Idempotency: process each event id at most once (24h window). Kept in
  // Upstash — cheap ephemeral dedup, no need for a table.
  const firstTime = await redis<string | null>(["SET", `stripe:evt:${event.id}`, "1", "NX", "EX", 86400]);
  if (firstTime === null) return NextResponse.json({ received: true, duplicate: true });

  const obj = event.data.object;

  try {
    if (event.type === "checkout.session.completed") {
      const meta = (obj.metadata as Record<string, string>) || {};
      const userId = str(obj.client_reference_id) || meta.userId;
      const plan = meta.plan as Plan | undefined;
      const customer = str(obj.customer);
      const subscription = str(obj.subscription);
      if (userId && (plan === "pro" || plan === "elite")) {
        await setPlan(userId, plan, { stripeCustomerId: customer, stripeSubscriptionId: subscription });
      }
    } else if (event.type === "customer.subscription.updated") {
      const meta = (obj.metadata as Record<string, string>) || {};
      const customer = str(obj.customer);
      const status = str(obj.status);
      const items = obj.items as { data?: { price?: { id?: string; product?: string } }[] } | undefined;
      const priceId = items?.data?.[0]?.price?.id;
      const productId = items?.data?.[0]?.price?.product;
      const userId = await userIdForCustomer(customer, meta.userId);
      if (userId) {
        const active = status === "active" || status === "trialing";
        // Match by price id, then product id, then the plan we stamped at checkout.
        const plan: Plan = active ? planForId(priceId) || planForId(productId) || (meta.plan as Plan) || "free" : "free";
        await setPlan(userId, plan);
      }
    } else if (event.type === "customer.subscription.deleted") {
      const meta = (obj.metadata as Record<string, string>) || {};
      const customer = str(obj.customer);
      const userId = await userIdForCustomer(customer, meta.userId);
      if (userId) await setPlan(userId, "free");
    }
  } catch (e) {
    // Alert + surface a 500 so Stripe retries delivery (money path — never silent).
    await reportError("stripe.webhook", e, { eventId: event.id, type: event.type });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
