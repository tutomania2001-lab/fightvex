"use client";

import { useEffect, useState } from "react";

export function Countdown({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) {
    return <span className="tnum text-muted">--d --h --m</span>;
  }

  const target = new Date(iso).getTime();
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const Cell = ({ v, l }: { v: number; l: string }) => (
    <div className="flex flex-col items-center">
      <span className="tnum text-2xl font-bold text-fg sm:text-3xl">{String(v).padStart(2, "0")}</span>
      <span className="text-[10px] uppercase tracking-widest text-muted">{l}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <Cell v={d} l="Days" />
      <span className="text-2xl text-line">:</span>
      <Cell v={h} l="Hrs" />
      <span className="text-2xl text-line">:</span>
      <Cell v={m} l="Min" />
      <span className="text-2xl text-line">:</span>
      <Cell v={s} l="Sec" />
    </div>
  );
}
