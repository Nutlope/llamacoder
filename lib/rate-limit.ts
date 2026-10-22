import { toast } from "@/hooks/use-toast";
import type { ActionResult } from "@/lib/action-result";

// The API routes and server actions are rate limited per IP
// (lib/rate-limit-config.ts) and respond with 429 / a rate_limited result;
// Vercel Firewall rules (vercel/firewall-rules.json) can also respond with 429.
export class RateLimitError extends Error {
  constructor() {
    super("Too many requests");
    this.name = "RateLimitError";
  }
}

export function generationRequestError(response: Response) {
  return response.status === 429
    ? new RateLimitError()
    : new Error(`Generation request failed (${response.status})`);
}

export function unwrapActionResult<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data;
  throw result.error === "rate_limited"
    ? new RateLimitError()
    : new Error("Request failed");
}

export function showRateLimitToast() {
  toast({
    title: "Slow down a little",
    description:
      "You've hit the request limit. Please wait a few minutes and try again.",
    variant: "destructive",
  });
}
