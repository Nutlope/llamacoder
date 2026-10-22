import { rateLimitStore, type RateLimitStore } from "@/lib/server-rate-limit";

// Replaces the Prisma-backed store with an in-memory one for route tests.
export function mockRateLimitStore(overrides: Partial<RateLimitStore> = {}) {
  const counts = new Map<string, number>();
  const claims = new Set<string>();

  Object.assign(rateLimitStore, {
    async increment(key: string) {
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return count;
    },
    async claim(key: string) {
      if (claims.has(key)) return false;
      claims.add(key);
      return true;
    },
    async hasClaim(key: string) {
      return claims.has(key);
    },
    async deleteExpired() {},
    ...overrides,
  } satisfies RateLimitStore);

  return { counts, claims };
}
