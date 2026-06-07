import type { Metadata } from "next";
import { Suspense } from "react";
import { allFighters } from "@/lib/data/fighters";
import { CompareLoader } from "@/components/compare/CompareLoader";
import { CompareView } from "@/components/compare/CompareView";

export const metadata: Metadata = {
  title: "Compare UFC Fighters Head-to-Head",
  description:
    "Overlay any two UFC or MMA fighters across every tracked metric — striking, grappling, physicals and a skill radar — for a full head-to-head comparison.",
  alternates: { canonical: "/compare" },
};

export default function ComparePage() {
  const fighters = allFighters();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="reveal mb-8">
        <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">Compare Fighters</h1>
        <p className="mt-2 max-w-2xl text-muted">Overlay two fighters across every tracked metric. Red is Fighter A, blue is Fighter B.</p>
      </div>
      <Suspense fallback={<CompareView fighters={fighters} />}>
        <CompareLoader fighters={fighters} />
      </Suspense>
    </div>
  );
}
