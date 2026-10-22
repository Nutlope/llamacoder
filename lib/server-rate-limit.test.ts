import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { PrismaClient } from "@prisma/client";
import { RATE_LIMITS } from "@/lib/rate-limit-config";
import {
  checkRateLimit,
  claimOnce,
  enforceRateLimit,
  getClientIp,
  normalizeIp,
  rateLimitStore,
  type RateLimitStore,
} from "@/lib/server-rate-limit";

function memoryStore(): RateLimitStore & { counts: Map<string, number> } {
  const counts = new Map<string, number>();
  const windows = new Map<string, number>();
  const claims = new Set<string>();
  return {
    counts,
    async increment(key, windowStart) {
      const start = windowStart.getTime();
      const current = windows.get(key);
      const count =
        current !== undefined && current >= start
          ? (counts.get(key) ?? 0) + 1
          : 1;
      counts.set(key, count);
      windows.set(key, Math.max(current ?? start, start));
      return count;
    },
    async claim(key) {
      if (claims.has(key)) return false;
      claims.add(key);
      return true;
    },
    async hasClaim(key) {
      return claims.has(key);
    },
    async deleteExpired() {},
  };
}

const noCleanup = () => 1;

test("requests within the per-minute limit pass and the next one is rejected", async () => {
  const store = memoryStore();
  const now = new Date("2026-10-22T12:00:10Z");
  const { limit } = RATE_LIMITS.createChat.rules[0];

  for (let i = 0; i < limit; i++) {
    const result = await checkRateLimit("createChat", "1.2.3.4", {
      now,
      store,
      random: noCleanup,
    });
    assert.deepEqual(result, { ok: true });
  }

  const rejected = await checkRateLimit("createChat", "1.2.3.4", {
    now,
    store,
    random: noCleanup,
  });
  assert.deepEqual(rejected, {
    ok: false,
    reason: "limited",
    retryAfterSeconds: 50,
  });
});

test("limits are tracked per IP and per bucket", async () => {
  const store = memoryStore();
  const now = new Date("2026-10-22T12:00:00Z");
  const options = { now, store, random: noCleanup };
  const { limit } = RATE_LIMITS.createChat.rules[0];

  for (let i = 0; i < limit; i++) {
    await checkRateLimit("createChat", "1.2.3.4", options);
  }

  assert.equal(
    (await checkRateLimit("createChat", "5.6.7.8", options)).ok,
    true,
  );
  assert.equal(
    (await checkRateLimit("generation", "1.2.3.4", options)).ok,
    true,
  );
  assert.equal(
    (await checkRateLimit("createChat", "1.2.3.4", options)).ok,
    false,
  );
});

test("a new minute window resets the minute counter but not the daily one", async () => {
  const store = memoryStore();
  const minuteLimit = RATE_LIMITS.createChat.rules[0].limit;
  const dayLimit = RATE_LIMITS.createChat.rules[1].limit;
  let now = new Date("2026-10-22T00:00:00Z");
  let accepted = 0;

  for (let i = 0; i < dayLimit + minuteLimit; i++) {
    if (i % minuteLimit === 0) now = new Date(now.getTime() + 60_000);
    const result = await checkRateLimit("createChat", "1.2.3.4", {
      now,
      store,
      random: noCleanup,
    });
    if (result.ok) accepted++;
  }

  assert.equal(accepted, dayLimit);
});

test("store failures fail closed for paid routes and open for og images", async () => {
  const failing: RateLimitStore = {
    ...memoryStore(),
    increment: async () => {
      throw new Error("database down");
    },
  };
  mock.method(console, "error", () => {});

  assert.deepEqual(
    await checkRateLimit("generation", "1.2.3.4", { store: failing }),
    { ok: false, reason: "unavailable" },
  );
  assert.deepEqual(
    await checkRateLimit("imageUpload", "1.2.3.4", { store: failing }),
    { ok: false, reason: "unavailable" },
  );
  assert.deepEqual(
    await checkRateLimit("ogImage", "1.2.3.4", { store: failing }),
    { ok: true },
  );

  mock.restoreAll();
});

test("enforceRateLimit returns a 429 JSON error the client toast understands", async () => {
  const store = memoryStore();
  const headers = new Headers({ "x-real-ip": "9.9.9.9" });
  const { limit } = RATE_LIMITS.chatTitle.rules[0];

  for (let i = 0; i < limit; i++) {
    assert.equal(
      await enforceRateLimit("chatTitle", headers, {
        store,
        random: noCleanup,
      }),
      null,
    );
  }
  const response = await enforceRateLimit("chatTitle", headers, {
    store,
    random: noCleanup,
  });

  assert.equal(response?.status, 429);
  assert.ok(Number(response?.headers.get("retry-after")) > 0);
  assert.equal(typeof (await response?.json()).error, "string");
});

test("enforceRateLimit returns 503 when a fail-closed limiter is down", async () => {
  mock.method(console, "error", () => {});
  const response = await enforceRateLimit("createChat", new Headers(), {
    store: {
      ...memoryStore(),
      increment: async () => {
        throw new Error("database down");
      },
    },
  });
  mock.restoreAll();

  assert.equal(response?.status, 503);
});

test("claimOnce succeeds only once per key and fails closed on errors", async () => {
  const store = memoryStore();
  mock.method(console, "error", () => {});

  assert.equal(await claimOnce("chat-title:abc", { store }), true);
  assert.equal(await claimOnce("chat-title:abc", { store }), false);
  assert.equal(
    await claimOnce("chat-title:def", {
      store: {
        ...store,
        claim: async () => {
          throw new Error("database down");
        },
      },
    }),
    false,
  );

  mock.restoreAll();
});

test("the client IP comes from Vercel headers, never a spoofable x-forwarded-for", () => {
  const vercel = { VERCEL: "1" };

  assert.equal(
    getClientIp(
      new Headers({
        "x-forwarded-for": "6.6.6.6",
        "x-real-ip": "1.2.3.4",
      }),
      vercel,
    ),
    "1.2.3.4",
  );
  assert.equal(
    getClientIp(
      new Headers({ "x-vercel-forwarded-for": "1.2.3.4, 10.0.0.1" }),
      vercel,
    ),
    "1.2.3.4",
  );
  assert.equal(
    getClientIp(new Headers({ "x-forwarded-for": "6.6.6.6" }), vercel),
    "unknown",
  );
  assert.equal(
    getClientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 1.1.1.1" }), {}),
    "6.6.6.6",
  );
});

test("IPv6 addresses share a /64 bucket and mapped IPv4 is unwrapped", () => {
  assert.equal(
    normalizeIp("2001:db8:1234:5678:aaaa:bbbb:cccc:dddd"),
    "2001:db8:1234:5678::/64",
  );
  assert.equal(normalizeIp("2001:DB8:1234:5678::1"), "2001:db8:1234:5678::/64");
  assert.equal(normalizeIp("2001:db8::1"), "2001:db8:0:0::/64");
  assert.equal(normalizeIp("::ffff:1.2.3.4"), "1.2.3.4");
  assert.equal(normalizeIp(" 1.2.3.4 "), "1.2.3.4");
});

test("the Prisma store increments with one atomic upsert statement", async () => {
  const calls: { sql: string; values: unknown[] }[] = [];
  mock.method(
    PrismaClient.prototype,
    "$queryRaw",
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      calls.push({ sql: strings.join("?"), values });
      return [{ count: 3 }];
    },
  );

  const windowStart = new Date("2026-10-22T12:00:00Z");
  const count = await rateLimitStore.increment(
    "createChat:60:1.2.3.4",
    windowStart,
  );

  assert.equal(count, 3);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO "RateLimit"/);
  assert.match(calls[0].sql, /ON CONFLICT \("key"\) DO UPDATE/);
  assert.match(calls[0].sql, /RETURNING "count"/);
  assert.deepEqual(calls[0].values, [
    "createChat:60:1.2.3.4",
    windowStart.toISOString(),
  ]);

  mock.restoreAll();
});
