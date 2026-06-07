import { NextResponse } from "next/server";
import { rateLimited, validateSignup, normalizeEmail } from "@/lib/auth";
import { clientIp } from "@/lib/ip";
import { badOrigin } from "@/lib/origin";
import { createSupabaseServerClient, supabaseEnabled } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const csrf = badOrigin(req);
  if (csrf) return csrf;
  if (!supabaseEnabled)
    return NextResponse.json({ error: "Accounts are not configured yet." }, { status: 503 });

  // Self-serve registration (free plan by default; upgrade via Stripe later).
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = String(body.email || "");
  const password = String(body.password || "");
  const name = String(body.name || "");

  // Throttle signups per IP to curb automated account spam.
  if (await rateLimited("signup", clientIp(req), 20, 60 * 60))
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const invalid = validateSignup(email, password, name);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  // Supabase Auth creates the user; the DB trigger provisions profile + stats.
  // The @supabase/ssr server client writes the session cookies on the response.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: { data: { name: name.trim() } },
  });
  if (error) {
    const taken = /already|registered|exists/i.test(error.message);
    return NextResponse.json(
      { error: taken ? "An account with this email already exists." : error.message },
      { status: taken ? 409 : 400 }
    );
  }

  const user = await getCurrentUser();
  return NextResponse.json({ user });
}
