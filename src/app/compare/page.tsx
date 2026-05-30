import type { Metadata } from "next";
import { Suspense } from "react";
import { allFighters } from "@/lib/data/fighters";
import { CompareLoader } from "@/components/compare/CompareLoader";
import { CompareView } from "@/components/compare/CompareView";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Compare Fighters",
  description: "Head-to-head MMA fighter comparison with skill overlays and stat-by-stat breakdowns.",
};

export default function ComparePage() {
  const fighters = allFighters();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Badge variant="blood">Head-to-Head</Badge>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase sm:text-5xl">Compare Fighters</h1>
        <p className="mt-2 max-w-2xl text-muted">Overlay two fighters across every tracked metric. Red is Fighter A, teal is Fighter B.</p>
      </div>
      <Suspense fallback={<CompareView fighters={fighters} />}>
        <CompareLoader fighters={fighters} />
      </Suspense>
    </div>
  );
}
