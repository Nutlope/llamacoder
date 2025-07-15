import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";
import { z } from "zod";
import Together from "together-ai";
import { ChatCompletionStream } from "together-ai/lib/ChatCompletionStream.mjs";
import { after } from "next/server";

export async function POST(req: Request) {
  const neon = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(neon);
  const prisma = new PrismaClient({ adapter });
  const { messageId, model } = await req.json();

  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return new Response(null, { status: 404 });
  }

  const messagesRes = await prisma.message.findMany({
    where: { chatId: message.chatId, position: { lte: message.position } },
    orderBy: { position: "asc" },
  });

  let messages = z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .parse(messagesRes);

  if (messages.length > 10) {
    messages = [messages[0], messages[1], messages[2], ...messages.slice(-7)];
  }

  let options: ConstructorParameters<typeof Together>[0] = {};
  if (process.env.HELICONE_API_KEY) {
    options.baseURL = "https://together.helicone.ai/v1";
    options.defaultHeaders = {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Property-appname": "LlamaCoder",
      "Helicone-Session-Id": message.chatId,
      "Helicone-Session-Name": "LlamaCoder Chat",
    };
  }

  const together = new Together(options);

  const res = await together.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
    temperature: 0.2,
    max_tokens: 9000,
  });

  const [s1, s2] = res.tee();

  let unlock: () => void;
  const promise = new Promise<void>((resolve) => {
    unlock = () => {
      resolve();
    };
  });

  ChatCompletionStream.fromReadableStream(s2.toReadableStream())
    .on("content", (delta) => {
      // console.log("Stream content:", delta);
    })
    .on("error", (error) => {
      console.error("Stream error:", error);
      unlock();
    })
    .on("finalContent", (finalText) => {
      console.log("Final content hook called");
    })
    .on("end", () => {
      console.log("Stream ended");
      unlock();
    });

  after(async () => {
    await promise;
    console.log("exiting after hook");
  });

  return new Response(s1.toReadableStream());
}

export const maxDuration = 60;
