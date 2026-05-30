import { classnames } from "@/lib/format";

export function Disclaimer({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={classnames(
        "flex items-start gap-2 rounded-lg border border-line bg-panel/60 px-3 py-2 text-[11px] leading-relaxed text-muted",
        className
      )}
    >
      <span className="mt-0.5 text-amber">ⓘ</span>
      <span>
        {children ??
          "Probabilistic research/entertainment tool based on historical statistics. MMA is high-variance — outcomes are uncertain. Not betting or financial advice. No guaranteed results. 21+ only."}
      </span>
    </p>
  );
}
