import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group flex items-center gap-2 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 26 26" className="shrink-0" aria-hidden>
        <polygon points="13,1 25,13 13,25 1,13" fill="none" stroke="#e10600" strokeWidth="1.5" />
        <path d="M6 13 L13 6 L20 13 L13 20 Z" fill="#e10600" opacity="0.15" />
        <path d="M8 16 L13 8 L18 16" fill="none" stroke="#f5f6f8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-lg font-bold uppercase tracking-tight text-fg">
        Fight<span className="text-blood">Vector</span>
      </span>
    </Link>
  );
}
