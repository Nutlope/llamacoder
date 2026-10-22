import { z } from "zod";

// Max length of a prompt or follow-up message typed by the user.
export const MAX_PROMPT_CHARS = 10_000;
// Generated replies are capped at 20k tokens server-side (~80k chars); restore
// messages re-embed the files of an existing reply.
export const MAX_ASSISTANT_MESSAGE_CHARS = 200_000;
export const MAX_OG_PROMPT_CHARS = 100;

const idSchema = z.string().min(1).max(64);

export const createChatRequestSchema = z.object({
  prompt: z.string().min(1).max(MAX_PROMPT_CHARS),
  model: z.string().min(1).max(200),
  screenshotToken: z.string().max(2_048).nullish(),
});

export const completionRequestSchema = z.object({
  messageId: idSchema,
  // Ignored: the model always comes from the stored chat.
  model: z.string().max(200).optional(),
});

export const chatTitleRequestSchema = z.object({
  chatId: idSchema,
});

export const userMessageSchema = z.object({
  chatId: idSchema,
  text: z.string().min(1).max(MAX_PROMPT_CHARS),
});

export const assistantMessageSchema = z.object({
  chatId: idSchema,
  text: z.string().min(1).max(MAX_ASSISTANT_MESSAGE_CHARS),
});

export const restoreMessageSchema = z.object({
  chatId: idSchema,
  messageId: idSchema,
  oldVersion: z.number().int().min(0).max(100_000),
  newVersion: z.number().int().min(0).max(100_000),
});
