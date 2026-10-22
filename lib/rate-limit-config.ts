// Per-IP limits for every public entry point, enforced by
// lib/server-rate-limit.ts. Keep vercel/firewall-rules.json in sync.
//
// "closed" policies reject requests when the limiter's database is unavailable
// (paid model calls and uploads); "open" policies let them through.

export type RateLimitRule = {
  limit: number;
  windowSeconds: number;
};

export type RateLimitPolicy = {
  failMode: "open" | "closed";
  rules: readonly RateLimitRule[];
};

const MINUTE = 60;
const DAY = 24 * 60 * 60;

export const RATE_LIMITS = {
  // POST /api/create-chat (paid: optional screenshot description)
  createChat: {
    failMode: "closed",
    rules: [
      { limit: 10, windowSeconds: MINUTE },
      { limit: 100, windowSeconds: DAY },
    ],
  },
  // POST /api/get-next-completion-stream-promise (paid: main generation).
  // Higher daily cap than createChat because follow-ups and auto-fix each
  // start a generation.
  generation: {
    failMode: "closed",
    rules: [
      { limit: 10, windowSeconds: MINUTE },
      { limit: 200, windowSeconds: DAY },
    ],
  },
  // POST /api/generate-chat-title (paid; also limited to once per chat)
  chatTitle: {
    failMode: "closed",
    rules: [
      { limit: 20, windowSeconds: MINUTE },
      { limit: 150, windowSeconds: DAY },
    ],
  },
  // createMessage server action (user follow-ups and auto-fix requests)
  createMessage: {
    failMode: "closed",
    rules: [
      { limit: 20, windowSeconds: MINUTE },
      { limit: 300, windowSeconds: DAY },
    ],
  },
  // saveAssistantMessage / restoreMessageVersion server actions
  saveMessage: {
    failMode: "closed",
    rules: [
      { limit: 30, windowSeconds: MINUTE },
      { limit: 400, windowSeconds: DAY },
    ],
  },
  // POST /api/s3-upload (presigned PUT)
  imageUpload: {
    failMode: "closed",
    rules: [
      { limit: 10, windowSeconds: MINUTE },
      { limit: 50, windowSeconds: DAY },
    ],
  },
  // POST /api/s3-upload/complete
  imageUploadComplete: {
    failMode: "closed",
    rules: [
      { limit: 10, windowSeconds: MINUTE },
      { limit: 50, windowSeconds: DAY },
    ],
  },
  // GET /api/og
  ogImage: {
    failMode: "open",
    rules: [{ limit: 60, windowSeconds: MINUTE }],
  },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

// Rows older than this are deleted opportunistically.
export const RATE_LIMIT_RETENTION_SECONDS = 2 * DAY;
