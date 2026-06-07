import type { NextConfig } from "next";

// Content-Security-Policy: scoped to what the app actually needs. We still allow
// 'unsafe-inline' for scripts (Next's inline hydration + our inline theme/reveal/
// JSON-LD scripts) — removing it cleanly requires a per-request nonce, which in
// Next forces dynamic rendering, so that's a deliberate, browser-tested migration
// (a report-uri is wired below so we can see violations before enforcing).
// 'unsafe-eval' is DROPPED in production (Next only needs it in dev for Fast
// Refresh), closing the eval()-based XSS lever for real users. Everything else is
// locked down: no framing, no plugins, self-only connections.
const isDev = process.env.NODE_ENV === "development";
const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "report-uri /api/csp-report",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  poweredByHeader: false, // don't advertise the framework/version
  reactStrictMode: true,
  // opentimestamps/bitcore-lib must not be bundled (it throws on double-load) —
  // keep it an external server-only require, loaded lazily by the commit layer.
  serverExternalPackages: ["opentimestamps"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
