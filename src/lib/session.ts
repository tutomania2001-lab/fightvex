// Server-side current-user helper for Server Components / Route Handlers.
// Reads the session cookie and resolves it to a user (or null). Keep this
// out of any module that runs on the client.
import { cookies } from "next/headers";
import { SESSION_COOKIE, getUserBySession, toPublicUser, type PublicUser } from "./auth";

export async function currentUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getUserBySession(token);
  return user ? toPublicUser(user) : null;
}
