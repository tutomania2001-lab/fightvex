"use client";

import { useSearchParams } from "next/navigation";
import type { Fighter } from "@/lib/types";
import { Simulator } from "./Simulator";

// Reads ?a=&b= query params (e.g. from a fighter page "Simulate" button)
// and passes them as the initial selection.
export function SimulatorLoader({ fighters }: { fighters: Fighter[] }) {
  const params = useSearchParams();
  const a = params.get("a") ?? undefined;
  const b = params.get("b") ?? undefined;
  const validA = fighters.find((f) => f.id === a)?.id;
  const validB = fighters.find((f) => f.id === b)?.id;
  return <Simulator fighters={fighters} initialA={validA} initialB={validB} />;
}
