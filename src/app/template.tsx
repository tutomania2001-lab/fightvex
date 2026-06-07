"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

// Next re-mounts this on every navigation, so each tab change replays the
// "surge" entrance (slide up + fade). The home page is excluded — it runs its
// own scroll-jacked surge and uses sticky/pinned layers a transform would break.
// Once the surge finishes we drop the class so the wrapper holds no transform —
// otherwise it would form a containing block and break fixed-position modals.
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [done, setDone] = useState(false);
  if (pathname === "/") return <>{children}</>;
  return (
    <div
      className={done ? undefined : "animate-surge"}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget) setDone(true); }}
    >
      {children}
    </div>
  );
}
