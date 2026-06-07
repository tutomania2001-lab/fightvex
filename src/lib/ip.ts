// Trusted client IP for rate-limiting. On Vercel `x-real-ip` is set by the
// platform edge and CANNOT be spoofed by the client (unlike the leftmost
// X-Forwarded-For hop, which the client controls). We prefer it, then fall
// back to the first XFF hop for other hosts / local dev.
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real && real.trim()) return real.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim() || "unknown";
  return "unknown";
}
