// ============================================================
// FightVex — verifiable pre-fight pick commitments (Bitcoin / OpenTimestamps).
//
// Before a card's fights, we hash the exact pick-set and anchor that hash in the
// Bitcoin blockchain via OpenTimestamps. After the fights, anyone can recompute
// the hash from the shown picks (in their own browser) and confirm — via the
// Bitcoin-anchored proof — that it existed BEFORE the event. We cannot back-date:
// the blockchain timestamp is set by Bitcoin's miners, not by us.
//
// Server-only (uses the OTS calendar protocol + Node crypto). Proofs are stored
// in the same Redis as predictions, base64-encoded.
// ============================================================
import { createHash } from "crypto";
import { redis, authEnabled } from "./auth";

// opentimestamps pulls in bitcore-lib, which throws if it's loaded twice during
// bundling — so we import it LAZILY, only inside the functions that stamp/verify
// (cron runtime). Reading commitments (the /accuracy page) never loads it.
async function loadOTS() {
  const m = await import("opentimestamps");
  return (m as { default?: unknown }).default ?? m;
}

export type CommitPick = { boutId: string; side: "A" | "B"; probA: number; method: string };
export interface Commitment {
  eventSlug: string;
  eventName: string;
  eventDate: string;       // when the fights happen
  committedAt: string;     // when we locked + stamped the picks (server clock)
  canonical: string;       // the exact string that was hashed (so anyone can re-hash)
  hash: string;            // sha256 hex of `canonical`
  ots: string;             // base64 OpenTimestamps proof
  bitcoin?: { height: number; time: string }; // filled once the Bitcoin attestation confirms
}

const cKey = (slug: string) => `commit:${slug}`;
const C_INDEX = "commit:index";

// Deterministic, sorted, human-readable canonical form. Anyone with the picks
// can reproduce this exact string and SHA-256 it to get the same hash.
export function canonicalCard(eventSlug: string, modelVersion: string, picks: CommitPick[]): string {
  const body = picks
    .slice()
    .sort((a, b) => a.boutId.localeCompare(b.boutId))
    .map((p) => `${p.boutId}=${p.side}:${p.probA.toFixed(4)}:${p.method}`)
    .join("|");
  return `FightVex|${modelVersion}|${eventSlug}|${body}`;
}
export const sha256hex = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/* eslint-disable @typescript-eslint/no-explicit-any */
const detachedFromHashHex = (OT: any, hex: string) =>
  OT.DetachedTimestampFile.fromHash(new OT.Ops.OpSHA256(), Buffer.from(hex, "hex"));

// Anchor a hash in Bitcoin (best-effort; returns base64 proof or null on failure).
async function stamp(hashHex: string): Promise<string | null> {
  try {
    const OT: any = await loadOTS();
    const d = detachedFromHashHex(OT, hashHex);
    await OT.stamp(d);
    return Buffer.from(d.serializeToBytes()).toString("base64");
  } catch { return null; }
}

// Try to upgrade a pending proof and extract the Bitcoin attestation if confirmed.
async function upgradeAndVerify(hashHex: string, otsB64: string): Promise<{ ots: string; bitcoin?: { height: number; time: string } }> {
  try {
    const OT: any = await loadOTS();
    const original = detachedFromHashHex(OT, hashHex);
    const proof = OT.DetachedTimestampFile.deserialize(Buffer.from(otsB64, "base64"));
    const changed = await OT.upgrade(proof);
    const ots = changed ? Buffer.from(proof.serializeToBytes()).toString("base64") : otsB64;
    const res = await OT.verify(proof, original);
    // res is e.g. { bitcoin: { timestamp, height } } once a block confirms the hash.
    const btc = res?.bitcoin;
    if (btc && btc.timestamp) return { ots, bitcoin: { height: btc.height, time: new Date(btc.timestamp * 1000).toISOString() } };
    return { ots };
  } catch { return { ots: otsB64 }; }
}

// Create a commitment for a card (idempotent — first lock wins, never overwritten).
export async function commitCard(c: Omit<Commitment, "hash" | "ots" | "bitcoin"> & { hash?: string }): Promise<boolean> {
  if (!authEnabled) return false;
  const exists = await redis<number>(["EXISTS", cKey(c.eventSlug)]);
  if (exists) return false;
  const hash = sha256hex(c.canonical);
  const ots = (await stamp(hash)) ?? "";
  const rec: Commitment = { ...c, hash, ots };
  const ok = await redis<string | null>(["SET", cKey(c.eventSlug), JSON.stringify(rec), "NX"]);
  if (ok) { await redis(["SADD", C_INDEX, c.eventSlug]); return true; }
  return false;
}

// Upgrade any pending commitments (no Bitcoin attestation yet). Called by cron.
export async function upgradeCommitments(): Promise<{ upgraded: number; pending: number }> {
  if (!authEnabled) return { upgraded: 0, pending: 0 };
  const slugs = (await redis<string[]>(["SMEMBERS", C_INDEX])) ?? [];
  let upgraded = 0, pending = 0;
  for (const slug of slugs) {
    const raw = await redis<string | null>([`GET`, cKey(slug)]);
    if (!raw) continue;
    const c = JSON.parse(raw) as Commitment;
    if (c.bitcoin || !c.ots) continue;
    const r = await upgradeAndVerify(c.hash, c.ots);
    if (r.bitcoin) { await redis(["SET", cKey(slug), JSON.stringify({ ...c, ots: r.ots, bitcoin: r.bitcoin })]); upgraded++; }
    else { if (r.ots !== c.ots) await redis(["SET", cKey(slug), JSON.stringify({ ...c, ots: r.ots })]); pending++; }
  }
  return { upgraded, pending };
}

// Drop a card's commitment so it re-anchors fresh picks (used when picks are
// re-logged pre-fight after a model upgrade — never after a fight).
export async function invalidateCommitment(slug: string): Promise<void> {
  if (!authEnabled) return;
  await redis(["DEL", cKey(slug)]);
  await redis(["SREM", C_INDEX, slug]);
}

export async function getCommitments(): Promise<Commitment[]> {
  if (!authEnabled) return [];
  const slugs = (await redis<string[]>(["SMEMBERS", C_INDEX])) ?? [];
  if (!slugs.length) return [];
  const raws = (await redis<(string | null)[]>(["MGET", ...slugs.map(cKey)])) ?? [];
  return raws.filter(Boolean).map((r) => JSON.parse(r as string) as Commitment).sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
}
