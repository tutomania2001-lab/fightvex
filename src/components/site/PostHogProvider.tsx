"use client";

// Privacy-respecting product analytics (PostHog). Dormant until
// NEXT_PUBLIC_POSTHOG_KEY is set, so it's safe to ship before configuring.
// App Router needs manual pageview capture on client-side navigation.
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!KEY) return;
    const qs = searchParams?.toString();
    posthog.capture("$pageview", { $current_url: pathname + (qs ? `?${qs}` : "") });
  }, [pathname, searchParams]);
  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!KEY || typeof window === "undefined") return; // dormant until configured
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false, // we capture manually for App Router
      capture_pageleave: true,
      person_profiles: "identified_only",
      defaults: "2025-05-24",
    });
  }, []);

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
    </>
  );
}
