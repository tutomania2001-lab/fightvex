// Server-only profile helpers for billing fields. These touch plan / stripe_*
// columns, which are service_role-only (see migration 0002), so they use the
// admin client. Name edits also go through here for simplicity.
import { createSupabaseAdmin } from "./admin";
import type { Plan } from "@/lib/entitlements";

export async function getProfileBilling(userId: string): Promise<{ stripeCustomerId?: string }> {
  const { data } = await createSupabaseAdmin()
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  return { stripeCustomerId: (data?.stripe_customer_id as string | null) ?? undefined };
}

export async function updateProfileBilling(
  userId: string,
  patch: { stripeCustomerId?: string | null; stripeSubscriptionId?: string | null; plan?: Plan }
): Promise<void> {
  const p: Record<string, unknown> = {};
  if ("stripeCustomerId" in patch) p.stripe_customer_id = patch.stripeCustomerId ?? null;
  if ("stripeSubscriptionId" in patch) p.stripe_subscription_id = patch.stripeSubscriptionId ?? null;
  if (patch.plan) p.plan = patch.plan;
  if (Object.keys(p).length) {
    await createSupabaseAdmin().from("profiles").update(p).eq("id", userId);
  }
}

export async function updateProfileName(userId: string, name: string): Promise<void> {
  await createSupabaseAdmin().from("profiles").update({ name }).eq("id", userId);
}
