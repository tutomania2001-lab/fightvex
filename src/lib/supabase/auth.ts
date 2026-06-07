// Supabase-backed auth helpers (server-only). Returns the same PublicUser shape
// the app already uses, so route handlers / session.ts stay drop-in compatible.
import { createSupabaseServerClient } from "./server";
import type { Plan } from "@/lib/entitlements";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  plan: Plan;
};

// Resolves the signed-in user from the Supabase session cookie, joined with the
// app profile (name + plan). Returns null when not signed in.
export async function getCurrentUser(): Promise<PublicUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, plan, created_at, email")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? profile?.email ?? "",
    name: profile?.name ?? "",
    plan: (profile?.plan as Plan) ?? "free",
    createdAt: profile?.created_at ?? user.created_at ?? "",
  };
}
