"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const inputCls =
  "w-full rounded-md border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-blood";

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const next = params.get("next") || "/account";

  const [mode, setMode] = useState<"login" | "signup">(
    params.get("mode") === "signup" ? "signup" : "login"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const payload = mode === "signup" ? { name, email, password } : { email, password };
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        setError(j.error || "Something went wrong. Try again.");
        return;
      }
      await refresh();
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel bg-cage-fine mt-8 w-full rounded-2xl p-8">
      <h1 className="font-display text-2xl font-bold uppercase">
        {mode === "signup" ? "Create account" : "Log in"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "signup"
          ? "Free to join. Upgrade to a plan anytime to unlock Full Access tools."
          : "Welcome back. Sign in to your account."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          required
        />
        <input
          type="password"
          placeholder="Password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
          minLength={8}
          required
        />

        {error && <p className="text-sm text-blood">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="btn-flare w-full rounded-md py-2.5 text-sm font-bold uppercase tracking-wide disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Continue"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        {mode === "signup" ? "Already have an account?" : "New to FightVex?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError(null);
          }}
          className="font-semibold text-blood hover:underline"
        >
          {mode === "signup" ? "Log in" : "Create one free"}
        </button>
      </p>
    </div>
  );
}
