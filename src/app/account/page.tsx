import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountView } from "@/components/auth/AccountView";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
  alternates: { canonical: "/account" },
};

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-10 h-64 w-full max-w-6xl animate-pulse rounded-2xl border border-line bg-cage-fine" />}>
      <AccountView />
    </Suspense>
  );
}
