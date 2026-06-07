import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
export async function resolve(spec, ctx, next) {
  if (spec.startsWith(".") && !/\.(ts|js|mjs|json)$/.test(spec)) {
    try { const u = new URL(spec + ".ts", ctx.parentURL); if (existsSync(fileURLToPath(u))) return next(spec + ".ts", ctx); } catch {}
  }
  return next(spec, ctx);
}
