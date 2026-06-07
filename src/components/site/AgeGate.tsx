"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";

// Lightweight client-side age/region acknowledgement gate.
// Production would pair this with server-side geofencing + verified KYC where required.
export function AgeGate() {
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("fv-age-ok") : "1";
    setOk(stored === "1");
    setReady(true);
  }, []);

  if (!ready || ok) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/95 p-4 backdrop-blur-md">
      <div className="bg-cage-fine spotlight w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-blood font-display text-2xl font-bold text-blood">
          21+
        </div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide">Age Verification</h2>
        <p className="mt-3 text-sm text-muted">
          FightVector contains betting-related analytics intended for adults of legal age (21+ in many regions). By entering, you confirm you are of legal age in your jurisdiction and accept our{" "}
          <a href="/legal/terms" className="text-blood underline">Terms</a> and{" "}
          <a href="/responsible-gambling" className="text-blood underline">Responsible Gambling</a> policy.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => { window.location.href = "https://www.google.com"; }}
            className="flex-1 rounded-md border border-line py-3 text-sm font-semibold text-muted hover:text-fg"
          >
            Exit
          </button>
          <button
            onClick={() => { localStorage.setItem("fv-age-ok", "1"); setOk(true); }}
            className="btn-flare flex-1 rounded-md py-3 text-sm font-semibold uppercase tracking-wide"
          >
            I am 21+
          </button>
        </div>
      </div>
    </div>
  );
}
