// ============================================================
// FightVex — Stripe billing (server-only, raw REST — no SDK).
//
// Flow: a logged-in user starts checkout for a plan → Stripe Checkout →
// on success Stripe calls our webhook → we upgrade THAT user's account
// (plan + stripeCustomerId/subscriptionId) in Redis. No accounts are
// ever auto-created by Stripe; checkout always carries the existing
// userId (client_reference_id + metadata).
//
// Required env (server-only unless noted):
//   STRIPE_SECRET_KEY            sk_live_... / sk_test_...
//   STRIPE_WEBHOOK_SECRET        whsec_...  (from the webhook endpoint)
//   NEXT_PUBLIC_STRIPE_PRICE_PRO    price_...  (recurring price for Pro)
//   NEXT_PUBLIC_STRIPE_PRICE_ELITE  price_...  (recurring price for Elite)
// ============================================================
import { createHmac, timingSafeEqual } from "crypto";
import type { Plan } from "./entitlements";

const SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
// Each may be a Stripe PRICE id (price_…) OR a PRODUCT id (prod_…). Product ids
// are resolved to their current default price at checkout, so changing a plan's
// price in Stripe needs no redeploy.
const PRO_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO;
const ELITE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE;

export const stripeEnabled = !!SECRET_KEY && !!(PRO_ID || ELITE_ID);

// ---- plan <-> id mapping ----
function configuredIdForPlan(plan: Plan): string | null {
  if (plan === "pro") return PRO_ID || null;
  if (plan === "elite") return ELITE_ID || null;
  return null; // free has no price
}

// Matches either a price id or a product id against the configured ids.
export function planForId(id: string | undefined): Plan | null {
  if (!id) return null;
  if (id === PRO_ID) return "pro";
  if (id === ELITE_ID) return "elite";
  return null;
}

// ---- raw Stripe REST (form-encoded) ----
async function stripePost<T = Record<string, unknown>>(
  path: string,
  params: Record<string, string>
): Promise<T> {
  const body = new URLSearchParams(params);
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`stripe ${path}: ${j?.error?.message || r.status}`);
  return j as T;
}

async function stripeGet<T = Record<string, unknown>>(path: string): Promise<T> {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${SECRET_KEY}` },
    cache: "no-store",
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`stripe ${path}: ${j?.error?.message || r.status}`);
  return j as T;
}

// Resolve a configured id to an actual price id. price_… is used as-is; prod_…
// is resolved to the product's current default price.
async function resolvePriceId(configured: string): Promise<string> {
  if (configured.startsWith("price_")) return configured;
  if (configured.startsWith("prod_")) {
    const product = await stripeGet<{ default_price?: string | { id: string } }>(`products/${configured}`);
    const dp = product.default_price;
    const id = typeof dp === "string" ? dp : dp?.id;
    if (!id) throw new Error(`Product ${configured} has no default price set in Stripe.`);
    return id;
  }
  return configured;
}

// Create a subscription Checkout Session for `plan`, tied to `userId`.
export async function createCheckoutSession(opts: {
  plan: Exclude<Plan, "free">;
  userId: string;
  email: string;
  customerId?: string;
  origin: string;
}): Promise<{ url: string }> {
  const configured = configuredIdForPlan(opts.plan);
  if (!configured) throw new Error(`No Stripe price configured for ${opts.plan}`);
  const price = await resolvePriceId(configured);

  const params: Record<string, string> = {
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${opts.origin}/account?section=subscription&checkout=success`,
    cancel_url: `${opts.origin}/pricing?checkout=cancel`,
    client_reference_id: opts.userId,
    "metadata[userId]": opts.userId,
    "metadata[plan]": opts.plan,
    // Mirror onto the subscription so later subscription.* events carry it too.
    "subscription_data[metadata][userId]": opts.userId,
    "subscription_data[metadata][plan]": opts.plan,
    allow_promotion_codes: "true",
  };
  // Reuse an existing customer if we have one, else let Stripe create one
  // keyed to the account email.
  if (opts.customerId) params.customer = opts.customerId;
  else params.customer_email = opts.email;

  // 7-day free trial for FIRST-TIME subscribers only (no existing Stripe
  // customer = never subscribed before), so it can't be farmed by re-signups.
  // The webhook already treats `trialing` as active, so they get Pro access
  // immediately and are billed only if they don't cancel within 7 days.
  if (!opts.customerId) params["subscription_data[trial_period_days]"] = "7";

  const session = await stripePost<{ url: string }>("checkout/sessions", params);
  return { url: session.url };
}

// Create a Billing Portal session so subscribers can manage/cancel.
export async function createPortalSession(customerId: string, origin: string): Promise<{ url: string }> {
  const session = await stripePost<{ url: string }>("billing_portal/sessions", {
    customer: customerId,
    return_url: `${origin}/account?section=subscription`,
  });
  return { url: session.url };
}

// ---- webhook signature verification (Stripe scheme) ----
// header: `t=<ts>,v1=<sig>[,v1=<sig>...]`; signature = HMAC-SHA256 of
// `${t}.${rawBody}` with the webhook secret. Verifies + checks freshness.
export function verifyWebhook(rawBody: string, sigHeader: string | null, toleranceSec = 300): boolean {
  if (!WEBHOOK_SECRET || !sigHeader) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i), kv.slice(i + 1)];
    })
  ) as { t?: string; v1?: string };
  if (!parts.t || !parts.v1) return false;

  const expected = createHmac("sha256", WEBHOOK_SECRET).update(`${parts.t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  // Reject stale timestamps (replay protection). now() is fine in a route.
  const ts = Number(parts.t);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(Date.now() / 1000 - ts) <= toleranceSec;
}
