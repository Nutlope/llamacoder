import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  RATE_LIMITS,
  RATE_LIMIT_RETENTION_SECONDS,
  type RateLimitBucket,
} from "@/lib/rate-limit-config";

export const RATE_LIMITED_MESSAGE =
  "Too many requests. Please wait a few minutes and try again.";
export const RATE_LIMIT_UNAVAILABLE_MESSAGE =
  "Service temporarily unavailable. Please try again shortly.";

export type RateLimitStore = {
  // Atomically increments the counter for `key` in the window starting at
  // `windowStart` (resetting it when a newer window starts) and returns the
  // new count.
  increment(key: string, windowStart: Date): Promise<number>;
  // Atomically creates `key` if it does not exist; true when this call won.
  claim(key: string, now: Date): Promise<boolean>;
  hasClaim(key: string): Promise<boolean>;
  deleteExpired(before: Date): Promise<void>;
};

export const rateLimitStore: RateLimitStore = {
  async increment(key, windowStart) {
    const rows = await getPrisma().$queryRaw<{ count: number | bigint }[]>`
      INSERT INTO "RateLimit" ("key", "count", "windowStart")
      VALUES (${key}, 1, ${windowStart.toISOString()}::timestamp(3))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."windowStart" >= EXCLUDED."windowStart"
            THEN "RateLimit"."count" + 1
          ELSE 1
        END,
        "windowStart" = GREATEST("RateLimit"."windowStart", EXCLUDED."windowStart")
      RETURNING "count"`;
    const count = Number(rows[0]?.count);
    if (!Number.isSafeInteger(count)) {
      throw new Error("Rate limit store returned no count");
    }
    return count;
  },
  async claim(key, now) {
    const rows = await getPrisma().$queryRaw<{ key: string }[]>`
      INSERT INTO "RateLimit" ("key", "count", "windowStart")
      VALUES (${key}, 1, ${now.toISOString()}::timestamp(3))
      ON CONFLICT ("key") DO NOTHING
      RETURNING "key"`;
    return rows.length === 1;
  },
  async hasClaim(key) {
    const row = await getPrisma().rateLimit.findUnique({
      where: { key },
      select: { key: true },
    });
    return row !== null;
  },
  async deleteExpired(before) {
    await getPrisma().$executeRaw`
      DELETE FROM "RateLimit"
      WHERE "windowStart" < ${before.toISOString()}::timestamp(3)`;
  },
};

export type RateLimitResult =
  | { ok: true }
  | { ok: false; reason: "limited"; retryAfterSeconds: number }
  | { ok: false; reason: "unavailable" };

type CheckOptions = {
  now?: Date;
  store?: RateLimitStore;
  random?: () => number;
};

const CLEANUP_PROBABILITY = 0.01;

export async function checkRateLimit(
  bucket: RateLimitBucket,
  clientKey: string,
  {
    now = new Date(),
    store = rateLimitStore,
    random = Math.random,
  }: CheckOptions = {},
): Promise<RateLimitResult> {
  const policy = RATE_LIMITS[bucket];

  try {
    for (const rule of policy.rules) {
      const windowMs = rule.windowSeconds * 1_000;
      const windowStartMs = Math.floor(now.getTime() / windowMs) * windowMs;
      const count = await store.increment(
        `${bucket}:${rule.windowSeconds}:${clientKey}`,
        new Date(windowStartMs),
      );
      if (count > rule.limit) {
        return {
          ok: false,
          reason: "limited",
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((windowStartMs + windowMs - now.getTime()) / 1_000),
          ),
        };
      }
    }
  } catch (error) {
    console.error(`Rate limiter unavailable for ${bucket}:`, error);
    return policy.failMode === "open"
      ? { ok: true }
      : { ok: false, reason: "unavailable" };
  }

  if (random() < CLEANUP_PROBABILITY) {
    store
      .deleteExpired(
        new Date(now.getTime() - RATE_LIMIT_RETENTION_SECONDS * 1_000),
      )
      .catch((error) => console.error("Rate limit cleanup failed:", error));
  }

  return { ok: true };
}

// Returns an error response when the request must be rejected, otherwise null.
export async function enforceRateLimit(
  bucket: RateLimitBucket,
  headers: Pick<Headers, "get">,
  options?: CheckOptions,
): Promise<NextResponse | null> {
  const result = await checkRateLimit(bucket, getClientIp(headers), options);
  return result.ok ? null : rateLimitErrorResponse(result);
}

export function rateLimitErrorResponse(
  result: Exclude<RateLimitResult, { ok: true }>,
) {
  if (result.reason === "limited") {
    return NextResponse.json(
      { error: RATE_LIMITED_MESSAGE },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSeconds) },
      },
    );
  }
  return NextResponse.json(
    { error: RATE_LIMIT_UNAVAILABLE_MESSAGE },
    { status: 503 },
  );
}

export const generationClaimKey = (messageId: string) =>
  `generation:${messageId}`;
export const chatTitleClaimKey = (chatId: string) => `chat-title:${chatId}`;

// One-shot claims (e.g. "generate this chat's title once"). Fails closed: a
// store error is treated as "already claimed".
export async function claimOnce(
  key: string,
  { now = new Date(), store = rateLimitStore }: CheckOptions = {},
): Promise<boolean> {
  try {
    return await store.claim(key, now);
  } catch (error) {
    console.error("Rate limit claim failed:", error);
    return false;
  }
}

export async function hasClaim(
  key: string,
  { store = rateLimitStore }: CheckOptions = {},
): Promise<boolean> {
  try {
    return await store.hasClaim(key);
  } catch (error) {
    console.error("Rate limit claim lookup failed:", error);
    return false;
  }
}

// The client IP as reported by Vercel's edge. `x-real-ip` is what
// `ipAddress()` from @vercel/functions reads; Vercel overwrites both it and
// `x-vercel-forwarded-for`, so neither can be spoofed by the client. The raw
// `x-forwarded-for` is only consulted outside Vercel (local dev).
export function getClientIp(
  headers: Pick<Headers, "get">,
  env: Record<string, string | undefined> = process.env,
): string {
  const vercelIp =
    headers.get("x-real-ip") ??
    firstListValue(headers.get("x-vercel-forwarded-for"));
  if (vercelIp) return normalizeIp(vercelIp);

  if (env.VERCEL !== "1") {
    const forwarded = firstListValue(headers.get("x-forwarded-for"));
    return forwarded ? normalizeIp(forwarded) : "local";
  }

  return "unknown";
}

function firstListValue(value: string | null) {
  const first = value?.split(",")[0]?.trim();
  return first || null;
}

// IPv6 clients usually control a whole /64, so they share one bucket.
export function normalizeIp(raw: string): string {
  const ip = raw.trim().toLowerCase().slice(0, 64);
  if (!ip.includes(":")) return ip;

  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];

  const groups = expandIpv6(ip);
  return groups ? `${groups.slice(0, 4).join(":")}::/64` : ip;
}

function expandIpv6(ip: string): string[] | null {
  const halves = ip.split("%")[0].split("::");
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;

  const groups = [...head, ...Array<string>(missing).fill("0"), ...tail];
  if (!groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map((group) => group.replace(/^0+(?=.)/, ""));
}
