import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/site/Logo";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: true }, alternates: { canonical: "/login" } };

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 sm:px-6">
      <Logo />
      <Suspense fallback={<div className="mt-8 h-72 w-full animate-pulse rounded-2xl border border-line bg-cage-fine" />}>
        <AuthForm />
      </Suspense>
      <p className="mt-4 text-center text-[11px] text-muted">21+ · By continuing you accept our <Link href="/legal/terms" className="text-blood underline">Terms</Link>.</p>
      <Link href="/" className="mt-6 text-sm text-muted hover:text-fg">← Back home</Link>
    </div>
  );
}
