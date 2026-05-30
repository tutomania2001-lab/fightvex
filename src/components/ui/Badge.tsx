import { classnames } from "@/lib/format";

type Variant = "blood" | "edge" | "amber" | "steel" | "neutral" | "outline";

const styles: Record<Variant, string> = {
  blood: "bg-blood/15 text-blood border-blood/30",
  edge: "bg-edge/12 text-edge border-edge/30",
  amber: "bg-amber/12 text-amber border-amber/30",
  steel: "bg-steel/10 text-steel border-steel/25",
  neutral: "bg-panel-2 text-muted border-line",
  outline: "bg-transparent text-fg border-line",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={classnames(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
