import { classnames } from "@/lib/format";

export function Panel({
  children,
  className,
  hover,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={classnames("panel rounded-xl", hover && "panel-hover", className)}>
      {children}
    </div>
  );
}

export function SectionHeading({
  kicker,
  title,
  action,
}: {
  kicker?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {kicker && (
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blood">
            <span className="inline-block h-3 w-1 bg-blood" />
            {kicker}
          </div>
        )}
        <h2 className="text-2xl font-bold uppercase tracking-wide text-fg sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
