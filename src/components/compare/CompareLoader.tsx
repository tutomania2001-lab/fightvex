"use client";

import { useSearchParams } from "next/navigation";
import type { Fighter } from "@/lib/types";
import { CompareView } from "./CompareView";

export function CompareLoader({ fighters }: { fighters: Fighter[] }) {
  const params = useSearchParams();
  const a = fighters.find((f) => f.id === params.get("a"))?.id;
  const b = fighters.find((f) => f.id === params.get("b"))?.id;
  return <CompareView fighters={fighters} initialA={a} initialB={b} />;
}
