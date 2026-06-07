// Server-side current-user helper for Server Components / Route Handlers.
// Backed by Supabase Auth (cookie session) → app profile. Keep this out of any
// module that runs on the client.
import { getCurrentUser, type PublicUser } from "./supabase/auth";

export type { PublicUser };

export async function currentUser(): Promise<PublicUser | null> {
  return getCurrentUser();
}
