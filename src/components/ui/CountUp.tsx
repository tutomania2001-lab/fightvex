"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

// Counts a number up from 0 to `value` on mount (same effect as the home-page
// hero stats). Because callers key their container by run/tab, a remount restarts
// the count. Respects prefers-reduced-motion (snaps instantly).
export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  commas = false,
  duration = 1.1,
  delay = 0,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  commas?: boolean;
  duration?: number;
  delay?: number;
}) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => {
    const n = commas ? Math.round(v).toLocaleString() : v.toFixed(decimals);
    return `${prefix}${n}${suffix}`;
  });
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const controls = animate(mv, value, { duration: reduce ? 0 : duration, delay: reduce ? 0 : delay, ease: "easeOut" });
    return () => controls.stop();
  }, [value, duration, delay, mv]);
  return <motion.span>{text}</motion.span>;
}
