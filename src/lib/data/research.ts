// ============================================================
// FightVector — FICTIONAL sample research-feed insight cards.
// In production each card is produced by an NLP layer over a
// LICENSED corpus and always carries source + recency +
// confidence. Nothing here is unsourced.
// ============================================================
import type { InsightCard } from "../types";

export const INSIGHTS: InsightCard[] = [
  {
    id: "i1",
    headline: "Petrov full camp confirmed, wrestling coach added",
    summary:
      "Kazimir Petrov's team confirmed a complete 10-week camp and the addition of a decorated wrestling coach to game-plan around Morales' takedown defense. Suggests a grappling-heavy approach in the rematch.",
    fighterSlug: "kazimir-petrov", eventSlug: "vanguard-fc-14", type: "Camp",
    source: "Promotion press release", sourceType: "Official", recency: "3h ago", confidence: "High",
    impact: ["Grappling", "Preparation"], impactScore: 72,
  },
  {
    id: "i2",
    headline: "Line moves toward Morales after open workouts",
    summary:
      "Aggregated odds shifted ~3 points toward Morales across major books following open workouts. Sharp action and public sentiment (71%) are aligned — limited contrarian value on the favorite.",
    eventSlug: "vanguard-fc-14", type: "Odds",
    source: "Licensed odds aggregator", sourceType: "Licensed API", recency: "6h ago", confidence: "High",
    impact: ["Betting Market"], impactScore: 65,
  },
  {
    id: "i3",
    headline: "Ivanova layoff now 11 months — activity flag raised",
    summary:
      "Svetlana Ivanova has not competed in 11 months. Long layoffs correlate with slow starts and timing issues in round one. Our model applies a ring-rust penalty; weigh against her one-shot power.",
    fighterSlug: "svetlana-ivanova", eventSlug: "vanguard-fc-14", type: "Analysis",
    source: "FightVector model + public record", sourceType: "Public Record", recency: "1d ago", confidence: "Medium",
    impact: ["Cardio", "Preparation"], impactScore: 58,
  },
  {
    id: "i4",
    headline: "Ferreira hits weight comfortably at staged check",
    summary:
      "Zico Ferreira reported on weight at a staged checkpoint with no signs of a difficult cut, reducing weight-miss risk for the welterweight title bout.",
    fighterSlug: "zico-ferreira", eventSlug: "vanguard-fc-14", type: "Weigh-in",
    source: "Athletic commission notice", sourceType: "Official", recency: "1d ago", confidence: "High",
    impact: ["Preparation"], impactScore: 40,
  },
  {
    id: "i5",
    headline: "Tanaka emphasizes pacing work in interview",
    summary:
      "In an attributed interview, Sora Tanaka said the camp focused on cardio and round management — a direct response to questions about his late-round output. Narrative signal, not yet reflected in stats.",
    fighterSlug: "sora-tanaka", type: "Analysis",
    source: "Combat outlet (attributed)", sourceType: "News (attributed)", recency: "2d ago", confidence: "Low",
    impact: ["Cardio"], impactScore: 35,
  },
  {
    id: "i6",
    headline: "Possible short-notice replacement on prelims",
    summary:
      "A prelim bout may need a short-notice replacement pending a medical clearance. Short-notice fighters carry a documented performance penalty — monitor before the line settles.",
    eventSlug: "vanguard-fc-14", type: "Replacement",
    source: "Multiple outlets (attributed)", sourceType: "News (attributed)", recency: "4h ago", confidence: "Low",
    impact: ["Preparation", "Betting Market"], impactScore: 48,
  },
];

export function allInsights(): InsightCard[] {
  return INSIGHTS;
}
export function insightsForFighter(slug: string): InsightCard[] {
  return INSIGHTS.filter((i) => i.fighterSlug === slug);
}
export function insightsForEvent(slug: string): InsightCard[] {
  return INSIGHTS.filter((i) => i.eventSlug === slug);
}
