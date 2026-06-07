// Shown instantly while the betting page renders (it pulls live odds), so a fast
// tab change never leaves the old page lingering.
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6" aria-busy="true">
      <div className="mb-8 space-y-3">
        <div className="h-6 w-44 animate-pulse rounded-full bg-panel" />
        <div className="h-11 w-80 animate-pulse rounded bg-panel" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-panel/70" />
      </div>
      <div className="mb-8 flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-7 w-32 animate-pulse rounded-full bg-panel" />
        ))}
      </div>
      <div className="mb-8 h-80 animate-pulse rounded-xl border border-line bg-panel/60" />
      <div className="mb-8 h-72 animate-pulse rounded-xl border border-line bg-panel/60" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl border border-line bg-panel/60" />
        <div className="h-64 animate-pulse rounded-xl border border-line bg-panel/60" />
      </div>
    </div>
  );
}
