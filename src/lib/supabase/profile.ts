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

// Set a user's plan reliably: UPSERT (not update) so a missing profile row — e.g.
// an account created before the signup trigger — is created instead of the write
// silently hitting 0 rows. `email` is required because profiles.email is NOT NULL.
// Surfaces DB errors so callers can react instead of falsely reporting success.
export async function setProfilePlan(
  userId: string,
  email: string,
  patch: { plan: Plan; stripeCustomerId?: string | null; stripeSubscriptionId?: string | null }
): Promise<void> {
  const row: Record<string, unknown> = { id: userId, email, plan: patch.plan };
  if ("stripeCustomerId" in patch) row.stripe_customer_id = patch.stripeCustomerId ?? null;
  if ("stripeSubscriptionId" in patch) row.stripe_subscription_id = patch.stripeSubscriptionId ?? null;
  const { error } = await createSupabaseAdmin().from("profiles").upsert(row, { onConflict: "id" });
  if (error) throw new Error(`profiles upsert: ${error.message}`);
}
