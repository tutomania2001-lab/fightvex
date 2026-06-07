// Supabase server client (Server Components + Route Handlers).
// Cookie-based auth via @supabase/ssr. Server-only.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// True once the project keys are set. Lets the rest of the app fall back to the
// existing (custom) auth until the migration is cut over.
export const supabaseEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In a Server Component cookies are read-only — the middleware refreshes
        // the session instead, so we can safely swallow the error here.
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* called from a Server Component render — handled by middleware */
        }
      },
    },
  });
}
