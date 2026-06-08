import type { MetadataRoute } from "next";
import { allFighters, getFighterById } from "@/lib/data/fighters";
import { allEvents } from "@/lib/data/events";

const BASE = "https://fightvex.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/simulator`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/events`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/betting`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/fighters`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/research`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/accuracy`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/compare`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/pricing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/methodology`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/security`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/dashboard`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${BASE}/responsible-gambling`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/legal/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/legal/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/legal/affiliate-disclosure`, changeFrequency: "yearly", priority: 0.2 },
  ].map((r) => ({ ...r, lastModified: now })) as MetadataRoute.Sitemap;

  const events: MetadataRoute.Sitemap = allEvents().map((e) => ({
    url: `${BASE}/events/${e.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const fighters: MetadataRoute.Sitemap = allFighters().map((f) => ({
    url: `${BASE}/fighters/${f.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Programmatic matchup-prediction pages (one per real bout, deduped by slug).
  const seenPredict = new Set<string>();
  const predicts: MetadataRoute.Sitemap = [];
  for (const e of allEvents()) {
    for (const m of e.matchups) {
      const a = getFighterById(m.fighterA);
      const b = getFighterById(m.fighterB);
      if (!a || !b) continue;
      const slug = `${a.slug}-vs-${b.slug}`;
      if (seenPredict.has(slug)) continue;
      seenPredict.add(slug);
      predicts.push({ url: `${BASE}/predict/${slug}`, lastModified: now, changeFrequency: "daily", priority: 0.7 });
    }
  }

  return [...staticRoutes, ...events, ...fighters, ...predicts];
}
