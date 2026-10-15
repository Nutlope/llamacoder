import { toast } from "@/hooks/use-toast";

// Vercel Firewall rate limit rules on /api/create-chat and
// /api/get-next-completion-stream-promise respond with 429.
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

export function showRateLimitToast() {
  toast({
    title: "Slow down a little",
    description:
      "You've hit the request limit. Please wait a few minutes and try again.",
    variant: "destructive",
  });
}
