import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { RelatedNews } from "@/components/live/RelatedNews";
import { NewsTabs } from "@/components/live/NewsTabs";

export const metadata: Metadata = {
  title: "UFC News & FightVex Updates",
  description:
    "Live UFC news aggregated from trusted outlets, plus FightVex's own development updates and achievements. Every news item is attributed to its source; every FightVex claim is verifiable on the site.",
  alternates: { canonical: "/research" },
};

const ufcFeed = (
  <div>
    <p className="reveal mb-5 max-w-2xl text-sm text-muted">
      Real UFC news aggregated continuously from leading outlets including Sherdog, MMA Fighting,
      MMA Mania, Bloody Elbow, BJPenn, LowKick, The Mac Life and ESPN, newest first. Every item is
      attributed to its source and links back to the original publisher — nothing generated or editorialized.
    </p>
    <RelatedNews limit={24} feed />
    <p className="reveal mt-8 rounded-lg border border-line bg-panel/60 p-4 text-[11px] leading-relaxed text-muted">
      Headlines are pulled live from public news feeds (Google News and the outlets&apos; own RSS) and open
      on the publisher&apos;s site. FightVex does not generate, rewrite or editorialize news content; the feed
      refreshes automatically. 21+.
    </p>
  </div>
);

export default function ResearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="reveal mb-8">
        <Badge variant="blood">News &amp; Updates</Badge>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase sm:text-5xl">Intelligence Feed</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Live UFC headlines from across the sport, plus <b className="text-fg">FightVex News</b> — our own
          development updates, features and verified results, newest first.
        </p>
      </div>

      <NewsTabs ufcNews={ufcFeed} />
    </div>
  );
}
