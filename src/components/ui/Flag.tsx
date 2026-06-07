// Renders a real country flag image (works on every platform, unlike flag
// emoji which falls back to 2-letter codes on Windows). The ISO code is derived
// from the stored flag emoji's regional-indicator code points; a small map
// covers sub-region flags (England/Scotland/Wales) and text country fields.
const SPECIAL: Record<string, string> = {
  England: "gb-eng",
  Scotland: "gb-sct",
  Wales: "gb-wls",
  UK: "gb",
  "United Kingdom": "gb",
  USA: "us",
  "United States": "us",
};

function emojiToCode(emoji: string): string | null {
  const pts = Array.from(emoji)
    .map((c) => c.codePointAt(0) ?? 0)
    .filter((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff);
  if (pts.length === 2) return pts.map((cp) => String.fromCharCode(cp - 0x1f1e6 + 0x41)).join("").toLowerCase();
  return null;
}

export function Flag({ emoji, country, className }: { emoji?: string; country: string; className?: string }) {
  // ESPN supplies a ready country-flag PNG URL — render it directly.
  if (emoji && /^https?:\/\//.test(emoji)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={emoji} alt={country} title={country} loading="lazy" className={className} style={{ objectFit: "cover" }} />;
  }
  const code = (emoji && emojiToCode(emoji)) || SPECIAL[country] || null;
  if (!code) return <span className={className} aria-label={country}>{emoji}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${code}.svg`}
      alt={country}
      title={country}
      loading="lazy"
      className={className}
      style={{ objectFit: "cover" }}
    />
  );
}
