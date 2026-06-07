import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Keeps the Supabase auth session fresh (no-op until Supabase is configured).
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on pages, skip static assets and image files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
