"use server";

import prisma from "@/lib/prisma";
import dedent from "dedent";
import { notFound } from "next/navigation";
import Together from "together-ai";
import { z } from "zod";

const together = new Together();

export async function createChat(prompt: string, model: string) {
  const res = await together.chat.completions.create({
    model: "meta-llama/Llama-3.2-3B-Instruct-Turbo",
    // model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    messages: [
      {
        role: "system",
        content:
          "You are a chatbot helping the user create a simple app or script, and your current job is to create a succinct title, maximum 3-5 words, for the chat given their initial prompt. Please return only the title.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });
  const title = res.choices[0].message?.content || prompt;

  const chat = await prisma.chat.create({
    data: {
      model,
      title,
      messages: {
        createMany: {
          data: [
            { role: "system", content: systemPrompt, position: 0 },
            { role: "user", content: prompt, position: 1 },
          ],
        },
      },
    },
    include: {
      messages: true,
    },
  });

  const lastMessage = chat.messages.at(-1);
  if (!lastMessage) throw new Error("No new message");

  return { chatId: chat.id, lastMessageId: lastMessage.id };
}

export async function createMessage(
  chatId: string,
  text: string,
  role: "assistant" | "user",
) {
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
      position: maxPosition + 1,
      chatId,
    },
  });

  return newMessage;
}

export async function streamNextCompletion(messageId: string, model: string) {
  console.log(1);
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  console.log(2);
  if (!message) notFound();
  console.log(3);

  const messagesRes = await prisma.message.findMany({
    where: { chatId: message.chatId, position: { lte: message.position } },
    orderBy: { position: "asc" },
  });

  const messages = z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .parse(messagesRes);

  console.log(4);
  const res = await together.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  });

  console.log(5);
  return res.toReadableStream();
}

export async function getNextCompletionStreamPromise(
  messageId: string,
  model: string,
) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) notFound();

  const messagesRes = await prisma.message.findMany({
    where: { chatId: message.chatId, position: { lte: message.position } },
    orderBy: { position: "asc" },
  });

  const messages = z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .parse(messagesRes);

  return {
    streamPromise: new Promise<ReadableStream>(async (resolve) => {
      const res = await together.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      });

      resolve(res.toReadableStream());
    }),
  };
}

const systemPrompt = dedent`
  You are an expert software developer who knows three technologies: React, Python, and Node.js.

  You will be given a prompt for a simple app, and your task is to return a single file with the code for that app.

  You should first decide what the appropriate technology is for the prompt. If the prompt sounds like a web app where a user interface would be appropiate, return a React component. Otherwise, if the prompt could be addressed with a simple script, use Python, unless Node is explicitly specified.

  Explain your work. The first codefence should include the main app. It should also include both the language (either tsx, ts, or python) followed by a sensible filename for the code. Use this format: \`\`\`tsx{filename=calculator.tsx}.

  Here are some more details:
  
  - If you're writing a React component, make sure you don't use any external dependencies, and export a single React component as the default export. Use TypeScript as the language, with "tsx" for any code fences. You can also use Tailwind classes for styling, making sure not to use arbitrary values.

  - If you're writing a Python or Node script, make sure running the script executes the code you wrote and prints some output to the console.

`;
