// Plain section divider for an event category on the Events page. NO background
// banner behind the title — just the heading, an optional count, and a hairline
// rule. Only the actual event cards below carry banners. Every category uses
// this same divider style.
export function CategoryBanner({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle?: string;
  count?: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
      <div className="flex items-center gap-3">
        <span className="h-7 w-1 rounded-full bg-blood" />
        <div>
          <h2 className="font-display text-2xl font-bold uppercase sm:text-3xl">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {count != null && (
        <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold uppercase tracking-wide text-steel">
          {count} {count === 1 ? "event" : "events"}
        </span>
      )}
    </div>
  );
}
