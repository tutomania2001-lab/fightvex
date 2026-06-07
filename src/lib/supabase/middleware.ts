// Refreshes the Supabase auth session on each request and rewrites the cookies
// onto the response (required for @supabase/ssr to keep tokens fresh in the App
// Router). No-ops entirely until the Supabase env keys are set, so it is safe to
// deploy before the migration is wired up.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Not configured yet → pass through untouched (current custom auth still runs).
  if (!url || !anon) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Touching getUser() refreshes the session and triggers the cookie rewrite.
  await supabase.auth.getUser();
  return response;
}
