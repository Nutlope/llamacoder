"use server";

import type { Message } from "@prisma/client";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import {
  assistantMessageSchema,
  restoreMessageSchema,
  userMessageSchema,
} from "@/lib/input-limits";
import { getPrisma } from "@/lib/prisma";
import type { RateLimitBucket } from "@/lib/rate-limit-config";
import {
  checkRateLimit,
  generationClaimKey,
  getClientIp,
  hasClaim,
} from "@/lib/server-rate-limit";
import { extractAllCodeBlocks, getFilesFromMessage } from "@/lib/utils";

// There are no user accounts, so chat ownership cannot be checked: anyone with
// a chat id can append to it. These actions only bound what can be written.

export async function createMessage(
  chatId: string,
  text: string,
): Promise<ActionResult<Message>> {
  const limited = await rateLimitAction("createMessage");
  if (limited) return limited;

  const input = userMessageSchema.safeParse({ chatId, text });
  if (!input.success) throw new Error("Invalid message");

  const prisma = getPrisma();
  const lastMessage = await getLastMessage(input.data.chatId);

  const newMessage = await prisma.message.create({
    data: {
      role: "user",
      content: input.data.text,
      position: (lastMessage?.position ?? -1) + 1,
      chatId: input.data.chatId,
    },
  });

  return { ok: true, data: newMessage };
}

// Persists the streamed reply to the chat's newest user message. Only allowed
// once per user message, and only after the generation route has started a
// generation for it. Files are derived from the stored history, not the client.
export async function saveAssistantMessage(
  chatId: string,
  text: string,
): Promise<ActionResult<Message>> {
  const limited = await rateLimitAction("saveMessage");
  if (limited) return limited;

  const input = assistantMessageSchema.safeParse({ chatId, text });
  if (!input.success) throw new Error("Invalid message");

  const prisma = getPrisma();
  const lastMessage = await getLastMessage(input.data.chatId);
  if (
    lastMessage?.role !== "user" ||
    !(await hasClaim(generationClaimKey(lastMessage.id)))
  ) {
    throw new Error("No pending generation for this chat");
  }

  const previousAssistantMessages = await prisma.message.findMany({
    where: { chatId: input.data.chatId, role: "assistant" },
    orderBy: { position: "asc" },
    select: { content: true },
  });
  const fileMap = new Map<string, ReturnType<typeof extractAllCodeBlocks>[0]>();
  for (const message of previousAssistantMessages) {
    for (const file of extractAllCodeBlocks(message.content)) {
      fileMap.set(file.path, file);
    }
  }
  for (const file of extractAllCodeBlocks(input.data.text)) {
    fileMap.set(file.path, file);
  }

  const newMessage = await prisma.message.create({
    data: {
      role: "assistant",
      content: input.data.text,
      files: Array.from(fileMap.values()),
      position: lastMessage.position + 1,
      chatId: input.data.chatId,
    },
  });

  return { ok: true, data: newMessage };
}

// Appends a copy of a stored assistant message's files as a new version.
export async function restoreMessageVersion(
  chatId: string,
  messageId: string,
  oldVersion: number,
  newVersion: number,
): Promise<ActionResult<Message | null>> {
  const limited = await rateLimitAction("saveMessage");
  if (limited) return limited;

  const input = restoreMessageSchema.safeParse({
    chatId,
    messageId,
    oldVersion,
    newVersion,
  });
  if (!input.success) throw new Error("Invalid restore request");

  const prisma = getPrisma();
  const message = await prisma.message.findFirst({
    where: {
      id: input.data.messageId,
      chatId: input.data.chatId,
      role: "assistant",
    },
  });
  if (!message) notFound();

  const restoredFiles = getFilesFromMessage(message);
  if (restoredFiles.length === 0) return { ok: true, data: null };

  const explanation = `Version ${input.data.newVersion} was created by restoring version ${input.data.oldVersion}.`;
  const content =
    explanation +
    "\n\n" +
    restoredFiles
      .map(
        (file) =>
          `\`\`\`${file.language}{path=${file.path}}\n${file.code}\n\`\`\``,
      )
      .join("\n\n");

  const lastMessage = await getLastMessage(input.data.chatId);
  const newMessage = await prisma.message.create({
    data: {
      role: "assistant",
      content,
      files: JSON.parse(JSON.stringify(restoredFiles)),
      position: (lastMessage?.position ?? -1) + 1,
      chatId: input.data.chatId,
    },
  });

  return { ok: true, data: newMessage };
}

async function getLastMessage(chatId: string) {
  const chat = await getPrisma().chat.findUnique({
    where: { id: chatId },
    select: {
      messages: {
        orderBy: { position: "desc" },
        take: 1,
        select: { id: true, role: true, position: true },
      },
    },
  });
  if (!chat) notFound();
  return chat.messages[0];
}

async function rateLimitAction(
  bucket: RateLimitBucket,
): Promise<ActionResult<never> | null> {
  const result = await checkRateLimit(bucket, getClientIp(await headers()));
  if (result.ok) return null;
  return {
    ok: false,
    error: result.reason === "limited" ? "rate_limited" : "unavailable",
  };
}
