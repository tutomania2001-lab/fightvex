-- ============================================================
-- Lock down billing-critical columns on profiles.
--
-- RLS is row-level only — our "own profile update" policy would otherwise let a
-- signed-in user PATCH their own row's `plan` directly via the public anon key
-- and self-upgrade to Elite for free. Column privileges fix that: users may
-- update ONLY their name; `plan` and the stripe_* columns are writable solely by
-- the service_role (Stripe webhook + trusted server routes), which bypasses both
-- RLS and column grants.
-- ============================================================
revoke update on public.profiles from anon, authenticated;
grant update (name) on public.profiles to authenticated;
