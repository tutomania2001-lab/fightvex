// Supabase admin client — uses the service_role key, which BYPASSES Row Level
// Security. Server-only. Use for trusted server code that must write across
// users: the Stripe webhook (plan changes), data migration, scheduled jobs.
// Never import from the client or expose the service_role key to the browser.
import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("supabase admin: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
