import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST as createChat } from "@/app/api/create-chat/route";
import { GET as ogImage } from "@/app/api/og/route";
import { FALLBACK_MODEL } from "@/lib/constants";
import {
  MAX_ASSISTANT_MESSAGE_CHARS,
  MAX_PROMPT_CHARS,
  assistantMessageSchema,
  chatTitleRequestSchema,
  completionRequestSchema,
  createChatRequestSchema,
  userMessageSchema,
} from "@/lib/input-limits";
import { RATE_LIMITS } from "@/lib/rate-limit-config";
import { mockRateLimitStore } from "@/lib/test/rate-limit-store";

test.beforeEach(() => mockRateLimitStore());

test("prompts are capped at MAX_PROMPT_CHARS", () => {
  const base = { model: FALLBACK_MODEL };
  assert.equal(
    createChatRequestSchema.safeParse({
      ...base,
      prompt: "a".repeat(MAX_PROMPT_CHARS),
    }).success,
    true,
  );
  assert.equal(
    createChatRequestSchema.safeParse({
      ...base,
      prompt: "a".repeat(MAX_PROMPT_CHARS + 1),
    }).success,
    false,
  );
  assert.equal(
    createChatRequestSchema.safeParse({ ...base, prompt: "" }).success,
    false,
  );
});

test("follow-up and assistant messages are bounded", () => {
  assert.equal(
    userMessageSchema.safeParse({
      chatId: "abc",
      text: "a".repeat(MAX_PROMPT_CHARS + 1),
    }).success,
    false,
  );
  assert.equal(
    assistantMessageSchema.safeParse({
      chatId: "abc",
      text: "a".repeat(MAX_ASSISTANT_MESSAGE_CHARS + 1),
    }).success,
    false,
  );
});

test("ids and screenshot tokens are bounded", () => {
  assert.equal(
    chatTitleRequestSchema.safeParse({ chatId: "a".repeat(65) }).success,
    false,
  );
  assert.equal(chatTitleRequestSchema.safeParse({ chatId: 1 }).success, false);
  assert.equal(
    completionRequestSchema.safeParse({ messageId: "a".repeat(65) }).success,
    false,
  );
  assert.equal(
    createChatRequestSchema.safeParse({
      prompt: "hi",
      model: FALLBACK_MODEL,
      screenshotToken: "a".repeat(2_049),
    }).success,
    false,
  );
});

test("create-chat rejects over-long prompts and unknown models before any work", async () => {
  const tooLong = await createChat(
    chatRequest({
      prompt: "a".repeat(MAX_PROMPT_CHARS + 1),
      model: FALLBACK_MODEL,
    }),
  );
  assert.equal(tooLong.status, 400);

  const unknownModel = await createChat(
    chatRequest({
      prompt: "Build a todo app",
      model: "meta-llama/Llama-3.1-405B-Instruct",
    }),
  );
  assert.equal(unknownModel.status, 400);
  assert.deepEqual(await unknownModel.json(), { error: "Unknown model" });
});

test("create-chat answers 429 once the per-IP limit is exhausted", async () => {
  const { limit } = RATE_LIMITS.createChat.rules[0];
  for (let i = 0; i < limit; i++) {
    const response = await createChat(chatRequest({ prompt: "", model: "x" }));
    assert.equal(response.status, 400);
  }

  const limited = await createChat(chatRequest({ prompt: "", model: "x" }));
  assert.equal(limited.status, 429);
  assert.equal(typeof (await limited.json()).error, "string");
});

test("og images truncate long prompts and are cacheable", async () => {
  const response = await ogImage(
    new Request(`http://localhost/api/og?prompt=${"a".repeat(5_000)}`, {
      headers: { "x-real-ip": "1.2.3.4" },
    }),
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /s-maxage=/);
});

function chatRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/create-chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}
