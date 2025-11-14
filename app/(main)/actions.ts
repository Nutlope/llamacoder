"use server";

import { getPrisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export async function createMessage(
  chatId: string,
  text: string,
  role: "assistant" | "user",
  files?: any[],
) {
  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { messages: true },
  });
  if (!chat) notFound();

  const maxPosition = Math.max(...chat.messages.map((m) => m.position));

  const newMessage = await prisma.message.create({
    data: {
      role,
      content: text,
      files: files ? JSON.parse(JSON.stringify(files)) : null,
      position: maxPosition + 1,
      chatId,
    },
  });

  return newMessage;
}
