"use client";

// Horizontal card selector for the Upcoming / Past Picks tabs — pick which fight
// card to open. Matches the betting board's card-tab style (btn-toggle pills).
// Hidden when there's only one card (nothing to choose).
const shortName = (name: string) => (name.includes(":") ? name.slice(name.indexOf(":") + 1).trim() : name);
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export function PickCardMenu({ cards, selected, onSelect }: {
  cards: { eventName: string; eventSlug: string; date: string }[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  if (cards.length <= 1) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {cards.map((c, i) => {
        const on = selected === i;
        return (
          <button
            key={c.eventSlug}
            type="button"
            onClick={() => onSelect(i)}
            aria-pressed={on}
            title={`${shortName(c.eventName)} · ${shortDate(c.date)}`}
            className={`btn-toggle shrink-0 rounded-md px-3 py-1.5 text-left ${on ? "is-on" : ""}`}
          >
            <span className="block max-w-[13rem] truncate text-xs font-bold uppercase tracking-wide">{shortName(c.eventName)}</span>
            <span className="block text-[10px] uppercase tracking-wider text-muted">{shortDate(c.date)}</span>
          </button>
        );
      })}
    </div>
  );
}
